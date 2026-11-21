"use client";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { del, get, keys, set } from "idb-keyval";
import type { Media, Ride, Trip, TripBundle } from "./types";

export type MediaBlobs = { display: Blob; thumb: Blob; video?: Blob };
type MediaRow = Omit<Media, "url" | "thumbUrl" | "videoUrl">;

export interface Store {
  mode: "local" | "cloud";
  listTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  saveTrip(trip: Trip): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  listRides(tripId: string): Promise<Ride[]>;
  addRide(ride: Ride): Promise<void>;
  deleteRide(ride: Ride): Promise<void>;
  listMedia(tripId: string): Promise<Media[]>;
  addMedia(row: MediaRow, blobs: MediaBlobs): Promise<Media>;
  updateMedia(m: Media): Promise<void>;
  deleteMedia(m: Media): Promise<void>;
  getPublished(slug: string): Promise<TripBundle | null>;
  joinTrip(code: string): Promise<string | null>;
}

const strip = (m: Media): MediaRow => {
  const { url: _u, thumbUrl: _t, videoUrl: _v, ...row } = m;
  void _u; void _t; void _v;
  return row;
};

/* ───────────────────────── Local (IndexedDB) ───────────────────────── */

const urlCache = new Map<string, string>();
async function blobUrl(key: string) {
  const hit = urlCache.get(key);
  if (hit) return hit;
  const b = await get<Blob>(key);
  if (!b) return "";
  const u = URL.createObjectURL(b);
  urlCache.set(key, u);
  return u;
}

const local: Store = {
  mode: "local",
  async listTrips() {
    const ks = (await keys()).filter((k) => typeof k === "string" && k.startsWith("tb:trip:")) as string[];
    const trips = (await Promise.all(ks.map((k) => get<Trip>(k)))).filter(Boolean) as Trip[];
    return trips.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async getTrip(id) {
    return (await get<Trip>(`tb:trip:${id}`)) ?? null;
  },
  async saveTrip(trip) {
    await set(`tb:trip:${trip.id}`, trip);
  },
  async deleteTrip(id) {
    const media = (await get<MediaRow[]>(`tb:media:${id}`)) ?? [];
    for (const m of media) for (const s of ["d", "t", "v"]) await del(`tb:blob:${m.id}:${s}`);
    await del(`tb:media:${id}`);
    await del(`tb:rides:${id}`);
    await del(`tb:trip:${id}`);
  },
  async listRides(tripId) {
    return (await get<Ride[]>(`tb:rides:${tripId}`)) ?? [];
  },
  async addRide(ride) {
    const all = (await get<Ride[]>(`tb:rides:${ride.tripId}`)) ?? [];
    await set(`tb:rides:${ride.tripId}`, [...all.filter((r) => r.id !== ride.id), ride]);
  },
  async deleteRide(ride) {
    const all = (await get<Ride[]>(`tb:rides:${ride.tripId}`)) ?? [];
    await set(`tb:rides:${ride.tripId}`, all.filter((r) => r.id !== ride.id));
  },
  async listMedia(tripId) {
    const rows = (await get<MediaRow[]>(`tb:media:${tripId}`)) ?? [];
    return Promise.all(rows.map(hydrateLocal));
  },
  async addMedia(row, blobs) {
    await set(`tb:blob:${row.id}:d`, blobs.display);
    await set(`tb:blob:${row.id}:t`, blobs.thumb);
    if (blobs.video) await set(`tb:blob:${row.id}:v`, blobs.video);
    const all = (await get<MediaRow[]>(`tb:media:${row.tripId}`)) ?? [];
    await set(`tb:media:${row.tripId}`, [...all, row]);
    return hydrateLocal(row);
  },
  async updateMedia(m) {
    const all = (await get<MediaRow[]>(`tb:media:${m.tripId}`)) ?? [];
    await set(`tb:media:${m.tripId}`, all.map((r) => (r.id === m.id ? strip(m) : r)));
  },
  async deleteMedia(m) {
    const all = (await get<MediaRow[]>(`tb:media:${m.tripId}`)) ?? [];
    await set(`tb:media:${m.tripId}`, all.filter((r) => r.id !== m.id));
    for (const s of ["d", "t", "v"]) await del(`tb:blob:${m.id}:${s}`);
  },
  async getPublished(slug) {
    const trip = (await this.listTrips()).find((t) => t.publishedSlug === slug);
    if (!trip) return null;
    return { trip, rides: await this.listRides(trip.id), media: await this.listMedia(trip.id) };
  },
  async joinTrip() {
    return null; // invites need the cloud backend
  },
};

async function hydrateLocal(row: MediaRow): Promise<Media> {
  return {
    ...row,
    url: await blobUrl(`tb:blob:${row.id}:d`),
    thumbUrl: await blobUrl(`tb:blob:${row.id}:t`),
    videoUrl: row.kind === "video" ? await blobUrl(`tb:blob:${row.id}:v`) : undefined,
  };
}

/* ───────────────────────── Cloud (Supabase) ───────────────────────── */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloudEnabled = Boolean(SB_URL && SB_KEY);
const BUCKET = "trip-media";

let _sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!_sb) _sb = createClient(SB_URL!, SB_KEY!);
  return _sb;
}

export async function currentUser(): Promise<User | null> {
  if (!cloudEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.user ?? null;
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};
const publicUrl = (path: string) => supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const hydrateCloud = (row: MediaRow): Media => ({
  ...row,
  url: publicUrl(`${row.tripId}/${row.id}-d.jpg`),
  thumbUrl: publicUrl(`${row.tripId}/${row.id}-t.jpg`),
  videoUrl: row.kind === "video" ? publicUrl(`${row.tripId}/${row.id}-v.${row.videoExt ?? "mp4"}`) : undefined,
});
const tripFromRow = (r: { id: string; data: Trip; invite_code: string; published_slug: string | null }): Trip => ({
  ...r.data, id: r.id, inviteCode: r.invite_code, publishedSlug: r.published_slug,
});

const cloud: Store = {
  mode: "cloud",
  async listTrips() {
    const { data, error } = await supabase().from("trips").select("id,data,invite_code,published_slug").order("updated_at", { ascending: false });
    fail(error);
    return (data ?? []).map(tripFromRow);
  },
  async getTrip(id) {
    const { data, error } = await supabase().from("trips").select("id,data,invite_code,published_slug").eq("id", id).maybeSingle();
    fail(error);
    return data ? tripFromRow(data) : null;
  },
  async saveTrip(trip) {
    const sb = supabase();
    const fields = { data: trip, invite_code: trip.inviteCode, published_slug: trip.publishedSlug ?? null, updated_at: new Date().toISOString() };
    const upd = await sb.from("trips").update(fields).eq("id", trip.id).select("id");
    fail(upd.error);
    if (upd.data && upd.data.length) return;
    const user = await currentUser();
    if (!user) throw new Error("Sign in to save trips");
    const ins = await sb.from("trips").insert({ id: trip.id, owner: user.id, ...fields });
    fail(ins.error);
  },
  async deleteTrip(id) {
    const sb = supabase();
    const { data } = await sb.storage.from(BUCKET).list(id, { limit: 1000 });
    if (data?.length) await sb.storage.from(BUCKET).remove(data.map((f) => `${id}/${f.name}`));
    fail((await sb.from("trips").delete().eq("id", id)).error);
  },
  async listRides(tripId) {
    const { data, error } = await supabase().from("rides").select("data").eq("trip_id", tripId);
    fail(error);
    return (data ?? []).map((r) => r.data as Ride);
  },
  async addRide(ride) {
    const user = await currentUser();
    fail((await supabase().from("rides").upsert({ id: ride.id, trip_id: ride.tripId, added_by: user?.id, data: ride })).error);
  },
  async deleteRide(ride) {
    fail((await supabase().from("rides").delete().eq("id", ride.id)).error);
  },
  async listMedia(tripId) {
    const { data, error } = await supabase().from("media").select("data").eq("trip_id", tripId);
    fail(error);
    return (data ?? []).map((r) => hydrateCloud(r.data as MediaRow));
  },
  async addMedia(row, blobs) {
    const sb = supabase();
    const st = sb.storage.from(BUCKET);
    const base = `${row.tripId}/${row.id}`;
    fail((await st.upload(`${base}-d.jpg`, blobs.display, { contentType: "image/jpeg", upsert: true })).error);
    fail((await st.upload(`${base}-t.jpg`, blobs.thumb, { contentType: "image/jpeg", upsert: true })).error);
    if (blobs.video)
      fail((await st.upload(`${base}-v.${row.videoExt ?? "mp4"}`, blobs.video, { contentType: blobs.video.type || "video/mp4", upsert: true })).error);
    const user = await currentUser();
    fail((await sb.from("media").insert({ id: row.id, trip_id: row.tripId, added_by: user?.id, data: row })).error);
    return hydrateCloud(row);
  },
  async updateMedia(m) {
    fail((await supabase().from("media").update({ data: strip(m) }).eq("id", m.id)).error);
  },
  async deleteMedia(m) {
    const sb = supabase();
    const base = `${m.tripId}/${m.id}`;
    await sb.storage.from(BUCKET).remove([`${base}-d.jpg`, `${base}-t.jpg`, `${base}-v.${m.videoExt ?? "mp4"}`]);
    fail((await sb.from("media").delete().eq("id", m.id)).error);
  },
  async getPublished(slug) {
    const { data, error } = await supabase().rpc("get_published", { slug });
    fail(error);
    if (!data) return null;
    const b = data as { trip: { id: string; data: Trip; invite_code: string; published_slug: string | null }; rides: Ride[]; media: MediaRow[] };
    return { trip: { ...tripFromRow(b.trip), inviteCode: "" }, rides: b.rides ?? [], media: (b.media ?? []).map(hydrateCloud) };
  },
  async joinTrip(code) {
    const { data, error } = await supabase().rpc("join_trip", { code });
    fail(error);
    return (data as string | null) ?? null;
  },
};

export const store: Store = cloudEnabled ? cloud : local;
