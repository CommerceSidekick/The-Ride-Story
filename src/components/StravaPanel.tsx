"use client";
import { useCallback, useEffect, useState } from "react";
import { leaveOnClick } from "@/lib/pending-save";
import type { Ride, Units } from "@/lib/types";
import { dayKeyToMs, fmtDist, fmtDuration, fmtEle } from "@/lib/util";

type Activity = { id: number; name: string; sport: string; start: string; startLocal: string; distanceM: number; elevGainM: number; movingSec: number };
type Status = { configured: boolean; connected: boolean; name?: string | null; error?: string };

const RESULT: Record<string, string> = {
  connected: "Strava connected.",
  denied: "Strava access was cancelled.",
  noscope: "Strava didn't share your activities. Connect again and leave “View data about your activities” ticked.",
  expired: "That Strava sign-in took too long. Try again.",
  error: "Strava sign-in failed. Try again.",
};

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Lists the signed-in rider's own Strava activities around the trip dates. Under Strava's API terms this list
 * is shown only to that rider and is never saved. To use a ride in the shared book, the rider exports their own
 * GPX from strava.com and drops it in — it then becomes their file, not API data.
 */
export function StravaPanel({ startDate, endDate, rides, units, onReturn }: { startDate: string | null; endDate: string | null; rides: Ride[]; units: Units; onReturn: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [from, setFrom] = useState(() => (startDate ? isoDay(dayKeyToMs(startDate) - 86400000) : isoDay(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => (endDate ? isoDay(dayKeyToMs(endDate) + 86400000) : isoDay(Date.now())));
  const [list, setList] = useState<Activity[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search).get("strava");
    return (q && RESULT[q]) || "";
  });

  useEffect(() => {
    fetch("/api/strava/status").then((r) => r.json()).then(setStatus).catch(() => setStatus({ configured: false, connected: false }));
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    setMsg((m) => (m === RESULT.connected ? m : ""));
    try {
      const after = Date.parse(from + "T00:00:00Z") / 1000 - 14 * 3600;
      const before = Date.parse(to + "T23:59:59Z") / 1000 + 14 * 3600;
      const r = await fetch(`/api/strava/activities?after=${after}&before=${before}`);
      const d = await r.json();
      if (r.status === 401) { setStatus((s) => (s ? { ...s, connected: false } : s)); throw new Error("Your Strava connection ended. Connect again."); }
      if (!r.ok) throw new Error(d.error ?? "Could not load Strava activities");
      setList(d.activities);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load Strava activities");
    }
    setBusy(false);
  }, [from, to]);

  useEffect(() => {
    if (!status?.connected || list !== null) return;
    const t = setTimeout(load, 0); // first load once connected
    return () => clearTimeout(t);
  }, [status, list, load]);

  if (!status || !status.configured) return null;

  const added = (a: Activity) => rides.some((r) => r.startUtc && Math.abs(r.startUtc - Date.parse(a.start)) < 180000);

  return (
    <div className="card mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-xl font-semibold">Your Strava rides</div>
          {status.connected && <div className="text-xs text-dust">Connected as {status.name} · visible only to you</div>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/strava/api_logo_pwrdBy_strava_horiz_black.svg" alt="Powered by Strava" className="h-3.5 w-auto" />
      </div>
      {msg && <p className="mt-3 rounded-lg bg-bone-2 px-3 py-2 text-sm">{msg}</p>}

      {!status.connected ? (
        <div className="mt-4">
          <p className="max-w-xl text-sm text-loam/80">Connect Strava to find the rides you recorded on this trip. Then export each one to add it here.</p>
          <a href={`/api/strava/connect?return=${encodeURIComponent(onReturn)}`} className="mt-3 inline-block" aria-label="Connect with Strava" onClick={leaveOnClick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/strava/btn_strava_connect_with_orange.svg" alt="Connect with Strava" width={237} height={48} />
          </a>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-2 text-sm">
            <label>
              <span className="label block">From</span>
              <input type="date" className="field mt-1 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              <span className="label block">To</span>
              <input type="date" className="field mt-1 !w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button className="btn btn-dark btn-sm" onClick={load} disabled={busy}>{busy ? "Loading…" : "Show rides"}</button>
            <button
              className="btn btn-ghost btn-sm ml-auto"
              onClick={async () => { await fetch("/api/strava/disconnect", { method: "POST" }); setStatus({ ...status, connected: false }); setList(null); setMsg("Strava disconnected."); }}
            >
              Disconnect
            </button>
          </div>
          {list && list.length === 0 && <p className="mt-4 text-sm text-dust">No Strava activities in those dates.</p>}
          {list && list.length > 0 && (
            <ol className="mt-4 divide-y divide-[#e2d9c8]">
              {list.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="font-mono text-xs text-loam/70">
                      {new Date(a.startLocal).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} · {fmtDist(a.distanceM / 1000, units)} · {fmtEle(a.elevGainM, units)} · {fmtDuration(a.movingSec)}
                    </div>
                  </div>
                  {added(a) ? (
                    <span className="rounded-full bg-agave/15 px-2.5 py-1 text-xs font-semibold text-agave">✓ In this trip</span>
                  ) : (
                    <a className="btn btn-primary btn-sm" href={`https://www.strava.com/activities/${a.id}/export_gpx`} target="_blank" rel="noreferrer">Export GPX</a>
                  )}
                  <a className="text-xs font-bold text-[#FC5200] underline underline-offset-2" href={`https://www.strava.com/activities/${a.id}`} target="_blank" rel="noreferrer">View on Strava</a>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs leading-relaxed text-dust">
            <b>Export GPX</b> downloads the ride from strava.com. Drop that file above and it joins the trip for the whole crew. Strava&apos;s rules let us show your Strava data only to you, so this list is never saved or shared, and nothing from it goes to the book or to AI writing.
          </p>
        </>
      )}
    </div>
  );
}
