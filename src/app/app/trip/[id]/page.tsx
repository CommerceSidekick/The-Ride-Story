"use client";
import { registerFlush } from "@/lib/pending-save";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountChip, AuthGate } from "@/components/AuthGate";
import { BookTab } from "@/components/BookTab";
import { CollectTab, type Workspace } from "@/components/CollectTab";
import { Mark } from "@/components/Logo";
import { SocialTab } from "@/components/SocialTab";
import { analyze } from "@/lib/analyze";
import { tripDates } from "@/lib/copy";
import { cloudEnabled, store } from "@/lib/store";
import type { Media, Ride, Trip } from "@/lib/types";
import { cx, fmtDist, fmtEle, shortCode, slugify } from "@/lib/util";

const TripMap = dynamic(() => import("@/components/TripMap").then((m) => m.TripMap), { ssr: false });

const TABS = [["collect", "Collect"], ["map", "Map"], ["book", "Book"], ["social", "Social"]] as const;
type Tab = (typeof TABS)[number][0];

export default function TripPage() {
  return (
    <AuthGate>
      <Suspense fallback={<div className="grid flex-1 place-items-center text-dust">Loading…</div>}>
        <TripWorkspace />
      </Suspense>
    </AuthGate>
  );
}

function TripWorkspace() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [rides, setRides] = useState<Ride[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "collect");
  const [saveState, setSaveState] = useState<"saved" | "saving" | string>("saved");
  const [share, setShare] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Trip | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await store.getTrip(id);
        if (t) {
          setRides(await store.listRides(id));
          setMedia(await store.listMedia(id));
        }
        setTrip(t);
      } catch (e) {
        setSaveState(e instanceof Error ? e.message : "Could not load trip");
        setTrip(null);
      }
    })();
  }, [id]);

  const flush = useCallback(async () => {
    if (!latest.current) return;
    try {
      await store.saveTrip(latest.current);
      setSaveState("saved");
    } catch (e) {
      setSaveState(e instanceof Error ? e.message : "Save failed");
    }
  }, []);

  const updateTrip = useCallback((patch: Partial<Trip>) => {
    setTrip((t) => {
      if (!t) return t;
      const next = { ...t, ...patch, updatedAt: Date.now() };
      latest.current = next;
      return next;
    });
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);

  // Don't lose the last half-second of edits when leaving the page.
  useEffect(() => {
    const now = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; return flush(); } return Promise.resolve(); };
    registerFlush(now);
    // Full-page navigations (e.g. connecting an app) don't unmount React, so also save on pagehide.
    window.addEventListener("pagehide", now);
    return () => { registerFlush(null); window.removeEventListener("pagehide", now); now(); };
  }, [flush]);

  const a = useMemo(() => (trip ? analyze(trip, rides, media) : null), [trip, rides, media]);

  if (trip === undefined) return <div className="grid flex-1 place-items-center text-dust">Loading trip…</div>;
  if (!trip || !a)
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-semibold">Trip not found</p>
          <p className="mt-1 text-sm text-dust">{cloudEnabled ? "It may have been deleted, or you haven't been invited to it." : "Trips in local mode live in the browser they were created in."}</p>
          <Link href="/app" className="btn btn-dark mt-4">Back to trips</Link>
        </div>
      </div>
    );

  const ws: Workspace = { trip, rides, media, a, updateTrip, setRides, setMedia };
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publishedUrl = trip.publishedSlug ? `${origin}/b/${trip.publishedSlug}` : null;
  const go = (t: Tab) => { setTab(t); router.replace(`/app/trip/${id}?tab=${t}`, { scroll: false }); };

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print border-b border-[#e2d9c8] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
          <Link href="/app" title="All trips"><Mark size={30} /></Link>
          <div className="min-w-0">
            <div className="truncate font-display text-xl font-semibold leading-tight">{trip.name}</div>
            <div className="truncate text-xs text-dust">
              {[trip.location, tripDates(a), a.totals.outings ? `${fmtDist(a.totals.distanceKm, trip.units, 0)} · ${fmtEle(a.totals.elevGainM, trip.units)} up` : null, `${a.totals.photos + a.totals.videos} shots`].filter(Boolean).join(" · ")}
            </div>
          </div>
          <nav className="order-last flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => go(k)} className={cx("rounded-full px-4 py-1.5 text-sm font-semibold transition", tab === k ? "bg-loam text-bone" : "text-loam/70 hover:bg-bone-2")}>{l}</button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className={cx("text-xs", saveState === "saved" || saveState === "saving" ? "text-dust" : "font-semibold text-clay")}>{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : saveState}</span>
            <Link className="btn btn-ghost btn-sm" href={`/app/trip/${id}/story`}>Preview story</Link>
            <button className="btn btn-primary btn-sm" onClick={() => setShare(true)}>Share</button>
            <span className="hidden md:block"><AccountChip /></span>
          </div>
        </div>
      </header>
      <main className="print-root mx-auto w-full max-w-7xl flex-1 px-5 py-6">
        {tab === "collect" && <CollectTab ws={ws} />}
        {tab === "map" && (a.totals.outings ? <TripMap a={a} /> : <p className="card p-8 text-center text-dust">Add a ride file in Collect to see the map.</p>)}
        {tab === "book" && <BookTab ws={ws} publishedUrl={publishedUrl} />}
        {tab === "social" && <SocialTab ws={ws} />}
      </main>

      {share && (
        <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShare(false)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Share</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShare(false)}>Close</button>
            </div>

            <div className="label mt-5">Invite the crew</div>
            {cloudEnabled ? (
              <>
                <p className="mt-1 text-sm text-dust">Anyone with this link can join the trip and add their own photos and ride files.</p>
                <CopyRow value={`${origin}/join/${trip.inviteCode}`} />
              </>
            ) : (
              <p className="mt-1 text-sm text-dust">Invites need the cloud backend, which isn&apos;t configured on this deployment. Until then, collect everyone&apos;s files on this device and pick the rider in “Adding as”.</p>
            )}

            <div className="label mt-6">Publish the story online</div>
            {rides.length + media.length === 0 ? (
              <p className="mt-1 text-sm text-dust">Add rides and photos first, then publish the story here.</p>
            ) : publishedUrl ? (
              <>
                <p className="mt-1 text-sm text-dust">
                  {cloudEnabled ? "Anyone with this link can scroll through the story over the 3D map, watch the clips and read the book. No sign-in needed." : "Local mode: this link only works in this browser. With the cloud backend it works for everyone."}
                </p>
                <CopyRow value={publishedUrl} />
                <div className="mt-3 flex gap-2">
                  <a className="btn btn-dark btn-sm" href={publishedUrl} target="_blank" rel="noreferrer">Open story</a>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateTrip({ publishedSlug: null })}>Unpublish</button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-dust">Creates a private-by-link story: your photos over a 3D map of the rides, plus the book if you&apos;ve made one. The printed book&apos;s back cover gets a QR code pointing to it.</p>
                <button className="btn btn-primary mt-3" onClick={() => updateTrip({ publishedSlug: `${slugify(trip.name) || "trip"}-${shortCode(6)}` })}>Publish story</button>
              </>
            )}

            <div className="mt-7 border-t border-[#e2d9c8] pt-4">
              <button
                className="text-sm font-semibold text-clay hover:underline"
                onClick={async () => {
                  if (!confirm(`Delete "${trip.name}" and all its photos, videos and rides? This cannot be undone.`)) return;
                  if (timer.current) clearTimeout(timer.current);
                  latest.current = null;
                  await store.deleteTrip(trip.id);
                  router.push("/app");
                }}
              >
                Delete this trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly className="field font-mono text-xs" value={value} onFocus={(e) => e.currentTarget.select()} />
      <button className="btn btn-dark btn-sm" onClick={() => navigator.clipboard.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}
