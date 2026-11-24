import "server-only";
import type { RideSummary } from "./types";
import { call, env, ProviderError, type Tokens } from "./vault";
import type { Provider } from "./registry";

/**
 * Ride sources with self-serve developer access. Each one lists the rider's own recent activities and
 * downloads the original FIT/GPX file, which the browser then adds to the trip exactly like a dropped file.
 * Base URLs can be overridden (e.g. WAHOO_API_BASE) for testing against a mock server.
 */

const form = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined) as [string, string][]);
const inWindow = (iso: string, after?: number, before?: number) => {
  const t = Date.parse(iso) / 1000;
  return (!after || t >= after) && (!before || t <= before);
};

/* ---------------- Wahoo ---------------- */

const WAHOO = () => env("WAHOO_API_BASE", "https://api.wahooligan.com");
const WAHOO_SPORTS: Record<number, string> = { 0: "Ride", 1: "Run" };

type WahooToken = { access_token: string; refresh_token?: string; expires_in?: number; created_at?: number };
const wahooTokens = (t: WahooToken, prev?: Tokens): Tokens => ({
  ...(prev ?? { account: "Wahoo" }),
  access: t.access_token,
  refresh: t.refresh_token ?? prev?.refresh,
  expiresAt: (t.created_at ?? Math.floor(Date.now() / 1000)) + (t.expires_in ?? 7200),
});

export const wahoo: Provider = {
  id: "wahoo", name: "Wahoo", kind: "rides",
  note: "Rides recorded on Wahoo devices. Workouts synced into Wahoo from other apps aren't shared by Wahoo.",
  configured: () => Boolean(env("WAHOO_CLIENT_ID") && env("WAHOO_CLIENT_SECRET")),
  authorizeUrl({ redirectUri, state }) {
    const u = new URL(`${WAHOO()}/oauth/authorize`);
    u.search = form({ client_id: env("WAHOO_CLIENT_ID"), redirect_uri: redirectUri, response_type: "code", scope: "user_read workouts_read", state }).toString();
    return u.toString();
  },
  async exchange({ code, redirectUri }) {
    const r = await call(`${WAHOO()}/oauth/token`, {
      label: "Wahoo", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({ client_id: env("WAHOO_CLIENT_ID"), client_secret: env("WAHOO_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    });
    const t = wahooTokens(await r.json());
    const me = await call(`${WAHOO()}/v1/user`, { label: "Wahoo", headers: { authorization: `Bearer ${t.access}` } }).then((x) => x.json()).catch(() => null);
    return { ...t, account: [me?.first, me?.last].filter(Boolean).join(" ") || "Wahoo", userId: me?.id ? String(me.id) : undefined };
  },
  async refresh(t) {
    if (!t.refresh) throw new ProviderError(401, "Wahoo access expired. Connect again.");
    const r = await call(`${WAHOO()}/oauth/token`, {
      label: "Wahoo", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form({ client_id: env("WAHOO_CLIENT_ID"), client_secret: env("WAHOO_CLIENT_SECRET"), grant_type: "refresh_token", refresh_token: t.refresh }),
    });
    return wahooTokens(await r.json(), t);
  },
  async revoke(t) {
    await fetch(`${WAHOO()}/v1/permissions`, { method: "DELETE", headers: { authorization: `Bearer ${t.access}` }, cache: "no-store" }).catch(() => {});
  },
  async listRides(t, { after, before }) {
    type W = { id: number; name?: string; starts: string; minutes?: number; workout_type_id?: number; workout_summary?: { distance_accum?: string; duration_active_accum?: string } | null };
    const out: RideSummary[] = [];
    // Sorted newest first; walk back until we pass the start of the window (max 5 pages).
    for (let page = 1; page <= 5; page++) {
      const r = await call(`${WAHOO()}/v1/workouts?page=${page}&per_page=50`, { label: "Wahoo", headers: { authorization: `Bearer ${t.access}` } });
      const d = (await r.json()) as { workouts?: W[]; total?: number };
      const list = d.workouts ?? [];
      for (const w of list) {
        if (!inWindow(w.starts, after, before)) continue;
        out.push({
          id: String(w.id), name: w.name || "Wahoo workout", sport: WAHOO_SPORTS[w.workout_type_id ?? -1], start: new Date(w.starts).toISOString(),
          distanceM: Number(w.workout_summary?.distance_accum) || undefined,
          movingSec: Number(w.workout_summary?.duration_active_accum) || (w.minutes ? w.minutes * 60 : undefined),
        });
      }
      const oldest = list.at(-1)?.starts;
      if (list.length < 50 || (after && oldest && Date.parse(oldest) / 1000 < after)) break;
    }
    return out;
  },
  async rideFile(t, id) {
    const r = await call(`${WAHOO()}/v1/workouts/${encodeURIComponent(id)}/workout_summary`, { label: "Wahoo", headers: { authorization: `Bearer ${t.access}` } });
    const s = (await r.json()) as { file?: { url?: string } };
    if (!s.file?.url) throw new ProviderError(404, "Wahoo has no ride file for this workout.");
    const f = await call(s.file.url, { label: "Wahoo" });
    return { body: await f.arrayBuffer(), ext: "fit" };
  },
};

/* ---------------- Polar ---------------- */

const POLAR_API = () => env("POLAR_API_BASE", "https://www.polaraccesslink.com");
const POLAR_AUTH = () => env("POLAR_AUTH_BASE", "https://flow.polar.com");
const POLAR_TOKEN = () => env("POLAR_TOKEN_URL", "https://polarremote.com/v2/oauth2/token");

/** ISO 8601 duration (PT1H2M3.5S) to seconds. */
const isoDur = (d?: string) => {
  const m = d?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : undefined;
};

export const polar: Provider = {
  id: "polar", name: "Polar", kind: "rides",
  note: "Polar shares exercises uploaded to Flow in the last 30 days, and only those synced after you connect.",
  configured: () => Boolean(env("POLAR_CLIENT_ID") && env("POLAR_CLIENT_SECRET")),
  authorizeUrl({ redirectUri, state }) {
    const u = new URL(`${POLAR_AUTH()}/oauth2/authorization`);
    u.search = form({ response_type: "code", client_id: env("POLAR_CLIENT_ID"), redirect_uri: redirectUri, scope: "accesslink.read_all", state }).toString();
    return u.toString();
  },
  async exchange({ code, redirectUri }) {
    const basic = Buffer.from(`${env("POLAR_CLIENT_ID")}:${env("POLAR_CLIENT_SECRET")}`).toString("base64");
    const r = await call(POLAR_TOKEN(), {
      label: "Polar", method: "POST",
      headers: { authorization: `Basic ${basic}`, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    });
    const t = (await r.json()) as { access_token: string; expires_in?: number; x_user_id: number | string };
    const userId = String(t.x_user_id);
    // A Polar user must be registered with this client before any data can be read. 409 = already registered.
    const reg = await fetch(`${POLAR_API()}/v3/users`, {
      method: "POST", cache: "no-store",
      headers: { authorization: `Bearer ${t.access_token}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ "member-id": `trs-${userId}` }),
    });
    if (reg.status === 403) throw new ProviderError(403, "Polar needs you to accept its data-sharing consents first. Check account.polar.com, then connect again.");
    if (!reg.ok && reg.status !== 409) throw new ProviderError(502, `Polar registration failed (${reg.status})`);
    const u = reg.ok ? ((await reg.json()) as { "first-name"?: string; "last-name"?: string }) : {};
    return {
      access: t.access_token, userId,
      expiresAt: t.expires_in ? Math.floor(Date.now() / 1000) + t.expires_in : undefined,
      account: [u["first-name"], u["last-name"]].filter(Boolean).join(" ") || "Polar Flow",
    };
  },
  async revoke(t) {
    if (!t.userId) return;
    await fetch(`${POLAR_API()}/v3/users/${encodeURIComponent(t.userId)}`, { method: "DELETE", headers: { authorization: `Bearer ${t.access}` }, cache: "no-store" }).catch(() => {});
  },
  async listRides(t, { after, before }) {
    type E = { id: string; start_time: string; start_time_utc_offset?: number; duration?: string; distance?: number; sport?: string; detailed_sport_info?: string; has_route?: boolean };
    const r = await call(`${POLAR_API()}/v3/exercises`, { label: "Polar", headers: { authorization: `Bearer ${t.access}`, accept: "application/json" } });
    const list = (await r.json()) as E[];
    return list
      .map((e) => {
        // start_time is local wall-clock time; the offset (minutes) turns it into UTC.
        const local = Date.parse(e.start_time.endsWith("Z") ? e.start_time : `${e.start_time}Z`);
        const start = new Date(local - (e.start_time_utc_offset ?? 0) * 60000).toISOString();
        const sport = (e.detailed_sport_info || e.sport || "").replace(/_/g, " ").toLowerCase();
        return { id: e.id, name: sport ? sport[0].toUpperCase() + sport.slice(1) : "Polar exercise", sport: e.has_route === false ? "No GPS" : undefined, start, distanceM: e.distance, movingSec: isoDur(e.duration) };
      })
      .filter((e) => inWindow(e.start, after, before))
      .sort((a, b) => b.start.localeCompare(a.start));
  },
  async rideFile(t, id) {
    const base = `${POLAR_API()}/v3/exercises/${encodeURIComponent(id)}`;
    const fit = await fetch(`${base}/fit`, { headers: { authorization: `Bearer ${t.access}`, accept: "*/*" }, cache: "no-store" });
    if (fit.ok && fit.status !== 204) return { body: await fit.arrayBuffer(), ext: "fit" };
    const gpx = await call(`${base}/gpx`, { label: "Polar", headers: { authorization: `Bearer ${t.access}`, accept: "application/gpx+xml" } });
    return { body: await gpx.arrayBuffer(), ext: "gpx" };
  },
};

/* ---------------- Ride with GPS ---------------- */

const RWGPS = () => env("RWGPS_API_BASE", "https://ridewithgps.com");
/**
 * Ride with GPS documents OAuth sign-in and the trips endpoints separately; we send the OAuth token both as a
 * Bearer token and as the user auth token, alongside the client's API key.
 */
const rwgpsHeaders = (t: Tokens) => ({
  authorization: `Bearer ${t.access}`, "x-rwgps-auth-token": t.access, "x-rwgps-api-key": env("RWGPS_API_KEY"), accept: "application/json",
});

export const rwgps: Provider = {
  id: "rwgps", name: "Ride with GPS", kind: "rides",
  configured: () => Boolean(env("RWGPS_CLIENT_ID") && env("RWGPS_CLIENT_SECRET") && env("RWGPS_API_KEY")),
  authorizeUrl({ redirectUri, state }) {
    const u = new URL(`${RWGPS()}/oauth/authorize`);
    u.search = form({ client_id: env("RWGPS_CLIENT_ID"), redirect_uri: redirectUri, response_type: "code", state }).toString();
    return u.toString();
  },
  async exchange({ code, redirectUri }) {
    const r = await call(`${RWGPS()}/oauth/token.json`, {
      label: "Ride with GPS", method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code, client_id: env("RWGPS_CLIENT_ID"), client_secret: env("RWGPS_CLIENT_SECRET"), redirect_uri: redirectUri }),
    });
    const t = (await r.json()) as { access_token: string; user_id?: number };
    const tokens: Tokens = { access: t.access_token, userId: t.user_id ? String(t.user_id) : undefined, account: "Ride with GPS" };
    const me = await call(`${RWGPS()}/api/v1/users/current.json`, { label: "Ride with GPS", headers: rwgpsHeaders(tokens) }).then((x) => x.json()).catch(() => null);
    return { ...tokens, account: me?.user?.name || tokens.account };
  },
  async revoke(t) {
    await fetch(`${RWGPS()}/oauth/revoke.json`, {
      method: "POST", headers: { "content-type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ client_id: env("RWGPS_CLIENT_ID"), client_secret: env("RWGPS_CLIENT_SECRET"), token: t.access }),
    }).catch(() => {});
  },
  async listRides(t, { after, before }) {
    type T = { id: number; name?: string; departed_at?: string | null; created_at?: string; distance?: number; moving_time?: number; activity_type?: string };
    const out: RideSummary[] = [];
    for (let page = 1; page <= 5; page++) {
      const r = await call(`${RWGPS()}/api/v1/trips.json?page=${page}&page_size=100`, { label: "Ride with GPS", headers: rwgpsHeaders(t) });
      const d = (await r.json()) as { trips?: T[]; meta?: { pagination?: { next_page_url?: string | null } } };
      for (const x of d.trips ?? []) {
        const when = x.departed_at || x.created_at;
        if (!when || !inWindow(when, after, before)) continue;
        out.push({ id: String(x.id), name: x.name || "Ride with GPS trip", sport: x.activity_type?.replace(/[_:]/g, " "), start: new Date(when).toISOString(), distanceM: x.distance, movingSec: x.moving_time });
      }
      if (!d.meta?.pagination?.next_page_url) break;
    }
    return out.sort((a, b) => b.start.localeCompare(a.start));
  },
  async rideFile(t, id) {
    const base = `${RWGPS()}/api/v1/trips/${encodeURIComponent(id)}`;
    const fit = await fetch(`${base}.fit`, { headers: { ...rwgpsHeaders(t), accept: "*/*" }, cache: "no-store" });
    if (fit.ok) return { body: await fit.arrayBuffer(), ext: "fit" };
    const gpx = await call(`${base}.gpx`, { label: "Ride with GPS", headers: { ...rwgpsHeaders(t), accept: "application/gpx+xml" } });
    return { body: await gpx.arrayBuffer(), ext: "gpx" };
  },
};
