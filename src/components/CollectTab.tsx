"use client";
import { useRef, useState } from "react";
import type { Analysis, Day, MediaX } from "@/lib/analyze";
import { dayTitle } from "@/lib/copy";
import { importFiles, offsetFromLon } from "@/lib/ingest";
import { cloudEnabled, store } from "@/lib/store";
import { StravaPanel } from "./StravaPanel";
import type { Media, Ride, Trip } from "@/lib/types";
import { RIDER_COLORS, cx, fmtDate, fmtDist, fmtDuration, fmtEle, fmtTime, uid } from "@/lib/util";

export type Workspace = {
  trip: Trip;
  rides: Ride[];
  media: Media[];
  a: Analysis;
  updateTrip: (patch: Partial<Trip>) => void;
  setRides: (f: (r: Ride[]) => Ride[]) => void;
  setMedia: (f: (m: Media[]) => Media[]) => void;
};

const OFFSETS = Array.from({ length: 27 }, (_, i) => (i - 12) * 60).concat([330, 345, 570, -210]).sort((a, b) => a - b);
const offLabel = (m: number) => `UTC${m >= 0 ? "+" : "−"}${Math.floor(Math.abs(m) / 60)}${m % 60 ? ":" + String(Math.abs(m) % 60).padStart(2, "0") : ""}`;

export function CollectTab({ ws }: { ws: Workspace }) {
  const { trip, a, updateTrip, setRides, setMedia } = ws;
  const [riderId, setRiderId] = useState(trip.crew[0]?.id ?? "");
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [drag, setDrag] = useState(false);
  const [newRider, setNewRider] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const onFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length || !riderId) return;
    setErrors([]);
    setNotice("");
    const hadRides = ws.rides.length > 0;
    const res = await importFiles(trip, riderId, files, (done, total, label) => setProgress({ done, total, label }));
    setProgress(null);
    setErrors(res.errors);
    if (res.rides.length) {
      setRides((r) => [...r, ...res.rides]);
      // First ride in the trip: set the trip's timezone from where it happened, so photos land on the route.
      if (!hadRides) {
        const guess = offsetFromLon(res.rides[0].points[0][1]);
        if (guess !== trip.utcOffsetMin) {
          updateTrip({ utcOffsetMin: guess });
          setNotice(`Trip timezone set to ${offLabel(guess)} from the ride's location. Photos are matched to the route using it — adjust below if the times look off.`);
        }
      }
    }
    if (res.media.length) setMedia((m) => [...m, ...res.media]);
  };

  const addRider = () => {
    const name = newRider.trim();
    if (!name) return;
    const r = { id: uid(), name, color: RIDER_COLORS[trip.crew.length % RIDER_COLORS.length] };
    updateTrip({ crew: [...trip.crew, r] });
    setRiderId(r.id);
    setNewRider("");
  };
  const removeRider = (id: string) => {
    if (ws.rides.some((r) => r.riderId === id) || ws.media.some((m) => m.riderId === id)) {
      setNotice("That rider still has photos or rides in the trip. Remove those first.");
      return;
    }
    const crew = trip.crew.filter((c) => c.id !== id);
    updateTrip({ crew });
    if (riderId === id) setRiderId(crew[0]?.id ?? "");
  };

  const patchMedia = async (m: Media, patch: Partial<Media>) => {
    const next = { ...m, ...patch };
    setMedia((all) => all.map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
    await store.updateMedia(next);
  };
  const removeMedia = async (m: Media) => {
    setMedia((all) => all.filter((x) => x.id !== m.id));
    await store.deleteMedia(m);
  };
  const removeRide = async (r: Ride) => {
    if (!confirm(`Remove the ride "${r.name}"?`)) return;
    setRides((all) => all.filter((x) => x.id !== r.id));
    await store.deleteRide(r);
  };

  const empty = ws.rides.length === 0 && ws.media.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          className={cx("rounded-2xl border-2 border-dashed p-7 text-center transition", drag ? "border-marigold bg-marigold/10" : "border-[#cfc4ae] bg-[#fffdf8]")}
        >
          <input ref={input} type="file" multiple hidden accept="image/*,video/*,.gpx,.fit,.tcx,.heic,.heif" onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }} />
          {progress ? (
            <div>
              <div className="font-display text-xl font-semibold">Adding {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…</div>
              <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-bone-2">
                <div className="h-full bg-marigold transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <div className="mt-2 truncate text-xs text-dust">{progress.label}</div>
            </div>
          ) : (
            <>
              <div className="font-display text-2xl font-semibold">Drop everything here</div>
              <p className="mx-auto mt-1 max-w-lg text-sm text-dust">Photos, videos, and ride files (GPX, FIT or TCX from Strava, Garmin, Wahoo, Coros…). Mix them freely — we sort it out by time and place.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-dust">Adding as</span>
                <select className="field !w-auto" value={riderId} onChange={(e) => setRiderId(e.target.value)} aria-label="Rider these files belong to">
                  {trip.crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={!riderId}>Choose files</button>
              </div>
            </>
          )}
        </div>
        {notice && <p className="mt-3 rounded-lg bg-agave/10 px-4 py-2 text-sm text-agave">{notice}</p>}
        {errors.length > 0 && (
          <div className="mt-3 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">
            <b>{errors.length} {errors.length === 1 ? "file was" : "files were"} skipped</b>
            <ul className="mt-1 list-disc pl-5">{errors.slice(0, 6).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <StravaPanel
          startDate={a.startDate}
          endDate={a.endDate}
          rides={ws.rides}
          units={trip.units}
          onReturn={`/app/trip/${trip.id}?tab=collect`}
        />

        {empty && (
          <details className="card mt-5 p-5 text-sm" open>
            <summary className="font-semibold">How do I get my ride file out of Strava?</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-loam/80">
              <li>Open the activity on strava.com (the website, not the phone app).</li>
              <li>Click the <b>⋯</b> menu under the activity title and choose <b>Export GPX</b> (or <b>Export Original</b> for the FIT file).</li>
              <li>Drop the downloaded file above. Each rider adds their own.</li>
            </ol>
            <p className="mt-3 text-dust">Garmin Connect, Wahoo, Coros and Komoot have the same export. For a whole trip at once, Strava&apos;s bulk export (Settings → My Account → Download your data) includes every activity file.</p>
          </details>
        )}

        {a.days.map((day) => (
          <DaySection key={day.date} day={day} ws={ws} patchMedia={patchMedia} removeMedia={removeMedia} removeRide={removeRide} />
        ))}
        {a.undated.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-semibold">No date</h2>
            <p className="text-sm text-dust">These files carry no capture time, so they are not placed on a day. You can still use them in the book and posts.</p>
            <Grid items={a.undated} ws={ws} patchMedia={patchMedia} removeMedia={removeMedia} />
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <div className="label">Trip</div>
          <input className="field mt-2 font-semibold" value={trip.name} onChange={(e) => updateTrip({ name: e.target.value })} aria-label="Trip name" />
          <input className="field mt-2" placeholder="Where (shown on the cover)" value={trip.location} onChange={(e) => updateTrip({ location: e.target.value })} aria-label="Location" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className="field" value={trip.utcOffsetMin} onChange={(e) => updateTrip({ utcOffsetMin: Number(e.target.value) })} aria-label="Trip timezone" title="Timezone where the trip happened. Used to match photo times to ride files.">
              {OFFSETS.map((o) => <option key={o} value={o}>{offLabel(o)}</option>)}
            </select>
            <select className="field" value={trip.units} onChange={(e) => updateTrip({ units: e.target.value as Trip["units"] })} aria-label="Units">
              <option value="metric">km · m</option>
              <option value="imperial">mi · ft</option>
            </select>
          </div>
          <label className="label mt-4 block">The short version</label>
          <textarea className="field mt-1 h-24 resize-none" placeholder="A few lines about the trip. Used in the book's intro." value={trip.notes} onChange={(e) => updateTrip({ notes: e.target.value })} />
        </div>

        <div className="card p-5">
          <div className="label">Crew</div>
          <ul className="mt-2 space-y-1.5">
            {a.riderStats.map((r) => (
              <li key={r.rider.id} className="group flex items-center gap-2 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.rider.color }} />
                <input className="min-w-0 flex-1 rounded bg-transparent px-1 font-medium hover:bg-bone-2 focus:bg-bone-2 focus:outline-none" value={r.rider.name} aria-label="Rider name"
                  onChange={(e) => updateTrip({ crew: trip.crew.map((c) => (c.id === r.rider.id ? { ...c, name: e.target.value } : c)) })} />
                <span className="shrink-0 text-xs text-dust">{r.rides} {r.rides === 1 ? "ride" : "rides"} · {r.photos} shots</span>
                {trip.crew.length > 1 && <button className="text-dust opacity-0 hover:text-clay group-hover:opacity-100" onClick={() => removeRider(r.rider.id)} title="Remove rider">✕</button>}
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addRider(); }}>
            <input className="field" placeholder="Add a rider" value={newRider} onChange={(e) => setNewRider(e.target.value)} />
            <button className="btn btn-dark btn-sm">Add</button>
          </form>
          <p className="mt-3 text-xs text-dust">
            {cloudEnabled
              ? "Use Share → Invite so everyone can add their own files from their own phone."
              : "Collecting for the whole group? Pick each rider in “Adding as” before dropping their files."}
          </p>
        </div>
      </aside>
    </div>
  );
}

type MediaOps = { ws: Workspace; patchMedia: (m: Media, p: Partial<Media>) => void; removeMedia: (m: Media) => void };

function DaySection({ day, ws, patchMedia, removeMedia, removeRide }: { day: Day; removeRide: (r: Ride) => void } & MediaOps) {
  const { trip, updateTrip } = ws;
  const name = (id: string) => trip.crew.find((c) => c.id === id)?.name ?? "Unknown";
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-display text-2xl font-semibold">Day {day.index}</h2>
        <span className="text-sm text-dust">{fmtDate(day.localMs)}</span>
        {day.groups.length > 0 && (
          <span className="font-mono text-xs text-loam/70">{fmtDist(day.stats.distanceKm, trip.units)} · {fmtEle(day.stats.elevGainM, trip.units)} up · {fmtDuration(day.stats.movingSec)}</span>
        )}
      </div>
      <div className="mt-2 text-sm font-medium text-loam/80">{dayTitle(day, trip)}</div>
      {day.groups.map((g) => (
        <div key={g.primary.id} className="card mt-3 px-4 py-3">
          {g.rides.map((r) => (
            <div key={r.id} className="group flex flex-wrap items-center gap-x-3 gap-y-1 py-1 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: trip.crew.find((c) => c.id === r.riderId)?.color }} />
              <span className="font-medium">{r.name}</span>
              <span className="text-dust">{name(r.riderId)}{r.startUtc ? ` · ${fmtTime(r.startUtc + trip.utcOffsetMin * 60000)}` : " · no timestamps"}</span>
              <span className="font-mono text-xs text-loam/70">{fmtDist(r.stats.distanceKm, trip.units)} · {fmtEle(r.stats.elevGainM, trip.units)}</span>
              {r.id === g.primary.id && g.rides.length > 1 && <span className="rounded-full bg-marigold/20 px-2 py-0.5 text-[11px] font-semibold">used for map & totals</span>}
              <button className="ml-auto text-xs text-dust opacity-0 hover:text-clay group-hover:opacity-100" onClick={() => removeRide(r)}>Remove</button>
            </div>
          ))}
          {g.rides.length > 1 && <p className="mt-1 text-xs text-dust">Same ride recorded by {g.rides.length} riders — counted once in trip totals, each rider keeps their own stats.</p>}
        </div>
      ))}
      <Grid items={day.media} ws={ws} patchMedia={patchMedia} removeMedia={removeMedia} />
      <textarea
        className="field mt-3 h-16 resize-none text-sm"
        placeholder={`What happened on day ${day.index}? Crashes, tacos, the climb that broke everyone… This goes in the book.`}
        value={trip.dayNotes?.[day.date] ?? ""}
        onChange={(e) => updateTrip({ dayNotes: { ...trip.dayNotes, [day.date]: e.target.value } })}
      />
    </section>
  );
}

function Grid({ items, ws, patchMedia, removeMedia }: { items: MediaX[] } & MediaOps) {
  if (!items.length) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {items.map((m) => {
        const rider = ws.trip.crew.find((c) => c.id === m.riderId);
        const raw = ws.media.find((x) => x.id === m.id)!;
        return (
          <div key={m.id} className={cx("group relative aspect-square overflow-hidden rounded-xl bg-bone-2", m.hidden && "opacity-35")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumbUrl} alt={m.name} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute bottom-1.5 left-1.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: rider?.color }} title={rider?.name} />
            {m.kind === "video" && <span className="absolute bottom-1 right-1.5 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">▶ {m.durationSec ? `${Math.round(m.durationSec)}s` : "clip"}</span>}
            {m.rideId && <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white" title="Matched to the ride by time">km {m.km?.toFixed(1)}</span>}
            <button className={cx("absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full text-base transition", m.starred ? "bg-marigold text-loam" : "bg-black/45 text-white opacity-0 group-hover:opacity-100")}
              onClick={() => patchMedia(raw, { starred: !m.starred })} title={m.starred ? "Unstar" : "Star: always include in the book"} aria-label="Star">★</button>
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1 opacity-0 transition group-hover:opacity-100">
              <button className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white" onClick={() => patchMedia(raw, { hidden: !m.hidden })}>{m.hidden ? "Show" : "Hide"}</button>
              <button className="rounded bg-clay px-1.5 py-0.5 text-[11px] font-medium text-white" onClick={() => removeMedia(raw)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
