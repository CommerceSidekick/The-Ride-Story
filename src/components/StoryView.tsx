"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickCover, pickPhotos, type Analysis, type Day, type MediaX } from "@/lib/analyze";
import { dayText, dayTitle, introText, outroText, tripDates } from "@/lib/copy";
import { bearingAt, cumulativeKm } from "@/lib/geo";
import type { Book, Trip } from "@/lib/types";
import { distUnit, distVal, eleUnit, eleVal, fmtDate, fmtDuration, joinNames } from "@/lib/util";
import { DAY_COLORS, shotCaption } from "./BookPageView";
import { SPONSOR } from "@/lib/sponsor";
import { Logo } from "./Logo";
import { TerrainMap, type MapController } from "./TerrainMap";

type Step =
  | { kind: "intro" }
  | { kind: "day"; day: Day }
  | { kind: "photo"; day: Day; m: MediaX; i: number }
  | { kind: "outro" };

const fmtNum = (v: number, digits = 0) => v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

/**
 * The online story: the trip told over a full-screen 3D map. As you scroll, the camera follows each day's
 * route, the line fills in up to where each photo was taken, and the photos float over the map.
 */
export function StoryView({ trip, a, book, onShowBook, editHref }: { trip: Trip; a: Analysis; book?: Book; onShowBook?: () => void; editHref?: string }) {
  const ctl = useRef<MapController | null>(null);
  const [active, setActive] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const tone = book?.config.tone ?? "stoked";
  const perDay = Math.max(3, Math.min(10, book?.config.photosPerDay ?? 6));

  const tracks = useMemo(
    () => a.days.flatMap((d) => d.groups.map((g) => ({ id: g.primary.id, points: g.primary.points, color: DAY_COLORS[(d.index - 1) % DAY_COLORS.length] }))),
    [a],
  );
  const photos = useMemo(
    () => a.days.flatMap((d) => d.media).filter((m) => !m.hidden && m.plat != null && m.plon != null).map((m) => ({ id: m.id, lat: m.plat!, lon: m.plon!, thumbUrl: m.thumbUrl })),
    [a],
  );
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [{ kind: "intro" }];
    for (const day of a.days) {
      out.push({ kind: "day", day });
      pickPhotos(day.media, perDay).forEach((m, i) => out.push({ kind: "photo", day, m, i }));
    }
    out.push({ kind: "outro" });
    return out;
  }, [a, perDay]);

  // Text: prefer what the riders wrote or edited in the book.
  const pageFor = (date: string) => book?.pages.find((p) => p.type === "day" && p.date === date);
  const intro = book?.pages.find((p) => p.type === "overview")?.text ?? introText(trip, a, tone);
  const outro = book?.pages.find((p) => p.type === "back")?.text ?? outroText(trip, a, tone);
  const cover = pickCover(a);

  // Which side the active card sits on, so the map subject lands in the open half of the screen.
  const sideOf = (s: Step): "left" | "right" | "center" => (s.kind === "photo" ? (s.i % 2 ? "right" : "left") : s.kind === "day" ? "left" : s.kind === "outro" ? "center" : "left");
  const side = sideOf(steps[active]);

  // Move the camera for the active step.
  useEffect(() => {
    const c = ctl.current;
    if (!c || !mapReady) return;
    const s = steps[active];
    const W = window.innerWidth, H = window.innerHeight;
    const narrow = W < 900;
    const sd = sideOf(s);
    const pad = narrow
      ? { top: 80, bottom: Math.round(H * 0.5), left: 30, right: 30 }
      : sd === "left" ? { top: 90, bottom: 90, left: Math.round(W * 0.5), right: 60 }
      : sd === "right" ? { top: 90, bottom: 90, left: 60, right: Math.round(W * 0.5) }
      : { top: Math.round(H * 0.5), bottom: 60, left: 80, right: 80 };
    const ptPad = narrow ? { top: 0, bottom: Math.round(H * 0.45), left: 0, right: 0 } : sd === "left" ? { top: 0, bottom: 0, left: Math.round(W * 0.52), right: 0 } : { top: 0, bottom: 0, left: 0, right: Math.round(W * 0.52) };
    const mainOf = (d: Day) => [...d.groups].sort((x, y) => y.primary.stats.distanceKm - x.primary.stats.distanceKm)[0];
    if (s.kind === "intro" || s.kind === "outro") {
      tracks.forEach((t) => c.setProgress(t.id, 1));
      c.setActivePhoto(null);
      c.showPins(new Set());
      c.focusTrack(null, { pitch: s.kind === "intro" ? 50 : 38, duration: 3000, padding: pad });
      return;
    }
    c.showPins(new Set(s.day.media.map((m) => m.id)));
    const g = mainOf(s.day);
    if (s.kind === "day") {
      c.setActivePhoto(null);
      if (g) { c.setProgress(g.primary.id, 0.0001); c.focusTrack(g.primary.id, { pitch: 58, duration: 3000, padding: pad }); }
      return;
    }
    const m = s.m;
    c.setActivePhoto(m.id);
    const onTrack = g && s.day.groups.find((x) => x.rides.some((r) => r.id === m.rideId));
    if (onTrack && m.km != null && m.plat != null && m.plon != null) {
      const p = onTrack.primary;
      const cum = cumulativeKm(p.points);
      const total = cum[cum.length - 1] || 1;
      c.setProgress(p.id, m.km / total);
      c.flyTo(m.plat, m.plon, { zoom: 13.6, pitch: 62, bearing: bearingAt(p.points, cum, m.km) - 25, duration: 3200, padding: ptPad });
    } else if (m.plat != null && m.plon != null) {
      c.flyTo(m.plat, m.plon, { zoom: 13.2, pitch: 60, duration: 3000, padding: ptPad });
    }
  }, [active, mapReady, steps, tracks]);

  // Which step is in the middle of the screen.
  const stepEls = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    stepEls.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [steps]);

  const t = a.totals;
  const units = trip.units;

  return (
    <div className="site relative min-h-screen bg-[#0e0f0c]">
      {/* The map sits under everything. */}
      <div className="fixed inset-0">
        {tracks.length > 0 ? (
          <TerrainMap tracks={tracks} photos={photos} interactive={false} initialPitch={50} className="h-full w-full" onReady={(c) => { ctl.current = c; setMapReady(true); }} />
        ) : cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt="" className="h-full w-full object-cover opacity-60" />
        ) : null}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(14,15,12,0.55), rgba(14,15,12,0) 30%), linear-gradient(180deg, rgba(14,15,12,0.6), rgba(14,15,12,0) 18%)" }} />
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ opacity: side === "left" ? 1 : 0, background: "linear-gradient(90deg, rgba(14,15,12,0.72) 0%, rgba(14,15,12,0.2) 45%, rgba(14,15,12,0) 62%)" }} />
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ opacity: side === "right" ? 1 : 0, background: "linear-gradient(270deg, rgba(14,15,12,0.72) 0%, rgba(14,15,12,0.2) 45%, rgba(14,15,12,0) 62%)" }} />
        <div className="pointer-events-none absolute inset-0 transition-opacity duration-1000" style={{ opacity: side === "center" ? 1 : 0, background: "radial-gradient(ellipse at 50% 38%, rgba(14,15,12,0.75), rgba(14,15,12,0.15) 70%)" }} />
      </div>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30">
        <div className="wrap flex h-16 items-center gap-4">
          <Link href="/" className="text-[#f2eee6]" aria-label="The Ride Story"><Logo size={24} /></Link>
          <span className="x-mono hidden truncate text-[0.75rem] uppercase tracking-[0.14em] text-[#a8a291] sm:block">{trip.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {editHref && <Link href={editHref} className="s-btn s-btn-ghost s-btn-sm">Edit</Link>}
            {onShowBook && <button onClick={onShowBook} className="s-btn s-btn-sm">Read the book</button>}
          </div>
        </div>
        <div className="h-[2px] bg-[#2e312b]">
          <div className="h-full bg-[#e8862a] transition-[width] duration-700" style={{ width: `${(active / Math.max(1, steps.length - 1)) * 100}%` }} />
        </div>
      </header>

      {/* The story scrolls over the map. */}
      <main className="relative z-10">
        {steps.map((s, i) => (
          <section key={i} data-step={i} ref={(el) => { stepEls.current[i] = el; }} className={`flex min-h-[100svh] items-center ${s.kind === "photo" ? "py-[18vh]" : "py-[14vh]"}`}>
            <div className="wrap w-full">
              {s.kind === "intro" && (
                <div className="max-w-[46rem]">
                  <div className="x-eyebrow">{[trip.location, tripDates(a)].filter(Boolean).join(" · ")}</div>
                  <h1 className="x-display mt-6 !text-[clamp(3rem,9vw,8.5rem)]">{trip.name}</h1>
                  {trip.crew.length > 0 && <p className="x-lead mt-5 text-[#f2eee6]/80">{joinNames(trip.crew.map((c) => c.name))}</p>}
                  <p className="x-lead mt-8 max-w-[40ch] text-[#f2eee6]/90">{intro}</p>
                  {t.outings > 0 && (
                    <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-[#f2eee6]/15 pt-6">
                      <Big v={fmtNum(distVal(t.distanceKm, units))} u={distUnit(units)} l="Ridden" />
                      <Big v={fmtNum(eleVal(t.elevGainM, units))} u={eleUnit(units)} l="Climbed" />
                      <Big v={String(t.rideDays)} l={t.rideDays === 1 ? "Day" : "Days"} />
                    </div>
                  )}
                  <div className="x-mono mt-14 text-[0.75rem] uppercase tracking-[0.16em] text-[#a8a291]">Scroll to ride along ↓</div>
                </div>
              )}

              {s.kind === "day" && (
                <Glass className="max-w-[34rem]">
                  <div className="flex items-center gap-3">
                    <span className="h-[3px] w-8 rounded-full" style={{ background: DAY_COLORS[(s.day.index - 1) % DAY_COLORS.length] }} />
                    <span className="x-mono text-[0.75rem] uppercase tracking-[0.16em] text-[#a8a291]">Day {s.day.index} · {fmtDate(s.day.localMs)}</span>
                  </div>
                  <h2 className="x-h2 mt-4 !text-[clamp(1.9rem,3.6vw,3rem)]">{pageFor(s.day.date)?.title ?? dayTitle(s.day, trip)}</h2>
                  <p className="mt-5 text-[1.05rem] leading-relaxed text-[#f2eee6]/88">{pageFor(s.day.date)?.text ?? dayText(s.day, trip, tone, trip.dayNotes?.[s.day.date])}</p>
                  {s.day.groups.length > 0 && (
                    <div className="mt-7 grid grid-cols-3 gap-5 border-t border-[#f2eee6]/12 pt-5">
                      <Big small v={fmtNum(distVal(s.day.stats.distanceKm, units), 1)} u={distUnit(units)} l="Distance" />
                      <Big small v={fmtNum(eleVal(s.day.stats.elevGainM, units))} u={eleUnit(units)} l="Climbing" />
                      <Big small v={fmtDuration(s.day.stats.movingSec)} l="Moving" />
                    </div>
                  )}
                </Glass>
              )}

              {s.kind === "photo" && (
                <figure className={`max-w-[min(46rem,100%)] ${s.i % 2 ? "ml-auto" : ""}`}>
                  <div className="overflow-hidden rounded-[6px] border border-[#f2eee6]/20 bg-[#0e0f0c]/40 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    {s.m.kind === "video" && s.m.videoUrl ? (
                      <video src={s.m.videoUrl} poster={s.m.url} controls playsInline preload="none" className="max-h-[68vh] w-full rounded-[3px] object-contain" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.m.url} alt={s.m.caption ?? ""} loading="lazy" className="max-h-[64vh] w-full rounded-[3px] object-cover" />
                    )}
                  </div>
                  <figcaption className="x-mono mt-3 inline-block rounded-[3px] bg-[#0e0f0c]/65 px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.12em] text-[#f2eee6]/85 backdrop-blur">
                    {shotCaption(s.m, trip) || `Day ${s.day.index}`}
                  </figcaption>
                </figure>
              )}

              {s.kind === "outro" && (
                <div className="mx-auto max-w-3xl rounded-[6px] border border-[#f2eee6]/10 bg-[#0e0f0c]/55 px-6 py-12 text-center backdrop-blur-md md:px-12">
                  <p className="x-h2 !text-[clamp(1.8rem,4vw,3.2rem)]">{outro}</p>
                  {t.outings > 0 && (
                    <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4">
                      <Big v={fmtNum(distVal(t.distanceKm, units))} u={distUnit(units)} l="Ridden" />
                      <Big v={fmtNum(eleVal(t.elevGainM, units))} u={eleUnit(units)} l="Climbed" />
                      <Big v={fmtNum(eleVal(t.maxEleM, units))} u={eleUnit(units)} l="High point" />
                      <Big v={fmtDuration(t.movingSec)} l="Moving" />
                    </div>
                  )}
                  <div className="mt-12 flex flex-wrap justify-center gap-4">
                    {onShowBook && <button onClick={onShowBook} className="s-btn">Read the book</button>}
                    <Link href="/" className="s-btn s-btn-ghost">Tell your own story</Link>
                  </div>
                  <p className="x-mono mt-16 text-[0.7rem] uppercase tracking-[0.16em] text-[#a8a291]">Made with The Ride Story</p>
                  <a href={SPONSOR.url("story-outro")} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-3 text-[#a8a291] transition hover:text-[#f2eee6]">
                    <span className="x-mono text-[0.66rem] uppercase tracking-[0.16em]">Sponsored by</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SPONSOR.logo} alt={SPONSOR.name} className="h-5 w-auto" />
                  </a>
                </div>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[6px] border border-[#f2eee6]/12 bg-[#0e0f0c]/62 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-9 ${className}`}>{children}</div>;
}

function Big({ v, u, l, small = false }: { v: string; u?: string; l: string; small?: boolean }) {
  return (
    <div>
      <div className={`whitespace-nowrap font-[family-name:var(--font-archivo)] font-extrabold leading-none [font-stretch:115%] ${small ? "text-[1.55rem]" : "text-[clamp(1.8rem,3.4vw,2.6rem)]"}`}>
        {v}
        {u && <span className="ml-1 text-[0.5em] font-semibold text-[#a8a291]">{u}</span>}
      </div>
      <div className="x-mono mt-2 text-[0.68rem] uppercase tracking-[0.16em] text-[#a8a291]">{l}</div>
    </div>
  );
}
