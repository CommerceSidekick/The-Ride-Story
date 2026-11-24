"use client";
import { useCallback, useState } from "react";
import { leaveOnClick } from "@/lib/pending-save";
import type { ProviderStatus, RideSummary } from "@/lib/connect/types";
import type { Ride, Units } from "@/lib/types";
import { dayKeyToMs, fmtDist, fmtDuration } from "@/lib/util";
import { useConnections } from "./useConnections";

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Wahoo, Polar, Ride with GPS: list the rider's own rides around the trip dates and add any of them
 * straight to the trip. The original FIT/GPX file is downloaded and handled like a dropped file.
 */
export function RideSourcesPanel({ startDate, endDate, rides, units, onReturn, onFiles }: {
  startDate: string | null; endDate: string | null; rides: Ride[]; units: Units; onReturn: string; onFiles: (files: File[]) => Promise<void>;
}) {
  const { providers, message, connectUrl, disconnect } = useConnections();
  const sources = (providers ?? []).filter((p) => p.kind === "rides" && p.configured);
  if (!sources.length) return null;
  return (
    <div className="card mt-5 p-5">
      <div className="font-display text-xl font-semibold">Ride apps</div>
      <p className="mt-1 text-sm text-dust">Connect an app and add rides from it directly. Only you see your list; rides you add join the trip.</p>
      <div className="mt-4 divide-y divide-[#e2d9c8]">
        {sources.map((p) => (
          <Source key={p.id} p={p} flash={message(p)} connectUrl={connectUrl(p.id, onReturn)} onDisconnect={() => disconnect(p.id)}
            startDate={startDate} endDate={endDate} rides={rides} units={units} onFiles={onFiles} />
        ))}
      </div>
    </div>
  );
}

function Source({ p, flash, connectUrl, onDisconnect, startDate, endDate, rides, units, onFiles }: {
  p: ProviderStatus; flash: string; connectUrl: string; onDisconnect: () => void;
  startDate: string | null; endDate: string | null; rides: Ride[]; units: Units; onFiles: (files: File[]) => Promise<void>;
}) {
  const [from, setFrom] = useState(() => (startDate ? isoDay(dayKeyToMs(startDate) - 86400000) : isoDay(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => (endDate ? isoDay(dayKeyToMs(endDate) + 86400000) : isoDay(Date.now())));
  const [list, setList] = useState<RideSummary[] | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(flash);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setBusy("list"); setMsg("");
    try {
      const after = Date.parse(from + "T00:00:00Z") / 1000 - 14 * 3600;
      const before = Date.parse(to + "T23:59:59Z") / 1000 + 14 * 3600;
      const r = await fetch(`/api/connect/${p.id}/rides?after=${after}&before=${before}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `Could not load ${p.name} rides`);
      setList(d.rides);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : `Could not load ${p.name} rides`);
    }
    setBusy("");
  }, [from, to, p.id, p.name]);

  const add = async (ride: RideSummary) => {
    setBusy(ride.id); setMsg("");
    try {
      const r = await fetch(`/api/connect/${p.id}/rides/${encodeURIComponent(ride.id)}`);
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Download failed");
      const ext = r.headers.get("x-ride-ext") ?? "fit";
      const safe = ride.name.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || `${p.id}-${ride.id}`;
      await onFiles([new File([await r.blob()], `${safe}.${ext}`)]);
      setAddedIds((ids) => [...ids, ride.id]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add that ride");
    }
    setBusy("");
  };

  const added = (x: RideSummary) => addedIds.includes(x.id) || rides.some((r) => r.startUtc && Math.abs(r.startUtc - Date.parse(x.start)) < 180000);

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{p.name}</div>
          <div className="text-xs text-dust">{p.connected ? `Connected as ${p.account}` : p.note ?? ""}</div>
        </div>
        {p.connected ? (
          <>
            <button className="btn btn-dark btn-sm" onClick={load} disabled={!!busy}>{busy === "list" ? "Loading…" : list ? "Refresh" : "Show rides"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setList(null); onDisconnect(); }}>Disconnect</button>
          </>
        ) : (
          <a className="btn btn-primary btn-sm" href={connectUrl} onClick={leaveOnClick}>Connect {p.name}</a>
        )}
      </div>
      {msg && <p className="mt-2 rounded-lg bg-bone-2 px-3 py-2 text-sm">{msg}</p>}
      {p.connected && list && (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
            <label><span className="label block">From</span><input type="date" className="field mt-1 !w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label><span className="label block">To</span><input type="date" className="field mt-1 !w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={!!busy}>Search</button>
          </div>
          {list.length === 0 && <p className="mt-3 text-sm text-dust">No {p.name} rides in those dates.{p.note ? ` ${p.note}` : ""}</p>}
          <ol className="mt-2 divide-y divide-[#e2d9c8]">
            {list.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{x.name}</div>
                  <div className="font-mono text-xs text-loam/70">
                    {new Date(x.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {x.distanceM ? ` · ${fmtDist(x.distanceM / 1000, units)}` : ""}{x.movingSec ? ` · ${fmtDuration(x.movingSec)}` : ""}{x.sport ? ` · ${x.sport}` : ""}
                  </div>
                </div>
                {added(x)
                  ? <span className="rounded-full bg-agave/15 px-2.5 py-1 text-xs font-semibold text-agave">✓ In this trip</span>
                  : <button className="btn btn-primary btn-sm" onClick={() => add(x)} disabled={!!busy}>{busy === x.id ? "Adding…" : "Add to trip"}</button>}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
