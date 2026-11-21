"use client";
import type { Analysis } from "@/lib/analyze";
import type { BookTheme, Slide, Trip } from "@/lib/types";
import { distUnit, distVal, eleUnit, eleVal, fmtDuration } from "@/lib/util";
import { allTracks, Editable, shotCaption } from "./BookPageView";
import { RouteArt } from "./RouteArt";

const u = (n: number) => `calc(var(--u) * ${n})`;

export type SlideCtx = {
  trip: Trip;
  a: Analysis;
  theme: BookTheme;
  aspect: number; // w / h
  handle?: string;
  editable?: boolean;
  onEdit?: (patch: Partial<Slide>) => void;
  onPickPhoto?: () => void;
};

/** One social image. Sized in --u like book pages, so the same markup exports at 1080px or previews at 200px. */
export function SlideView({ slide, ctx, className = "", style }: { slide: Slide; ctx: SlideCtx; className?: string; style?: React.CSSProperties }) {
  const { trip, a, editable = false, onEdit } = ctx;
  const m = slide.photoId ? a.mediaById.get(slide.photoId) : undefined;
  const tall = ctx.aspect < 0.7;
  const day = slide.date ? a.days.find((d) => d.date === slide.date) : undefined;
  const pick = editable && ctx.onPickPhoto ? ctx.onPickPhoto : undefined;
  const photoEl = (dim = 0) => (
    <div className="absolute inset-0" onClick={pick} style={{ cursor: pick ? "pointer" : undefined, background: "var(--pg-panel)" }} title={pick ? "Click to swap photo" : undefined}>
      {m && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.url} alt="" crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {dim > 0 && <div className="absolute inset-0" style={{ background: `rgba(15,13,11,${dim})` }} />}
    </div>
  );
  const handleEl = (light = false) =>
    ctx.handle ? (
      <div className="tb-kicker absolute" style={{ right: u(5), top: u(tall ? 16 : 5), fontSize: u(2.2), color: light ? "#f3eee4" : "var(--pg-mute)", opacity: 0.9 }}>
        @{ctx.handle.replace(/^@/, "")}
      </div>
    ) : null;
  // Stories keep text clear of the top/bottom UI chrome.
  const safe = tall ? { paddingTop: u(22), paddingBottom: u(26) } : {};

  let body: React.ReactNode = null;
  if (slide.template === "cover")
    body = (
      <>
        {photoEl()}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.9) 0%, rgba(15,13,11,0.2) 55%, rgba(15,13,11,0.1) 100%)" }} />
        {handleEl(true)}
        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ padding: u(7), paddingBottom: tall ? u(28) : u(8), color: "#f3eee4" }}>
          <Editable editable={editable} value={slide.kicker ?? ""} onChange={(kicker) => onEdit?.({ kicker })} className="tb-kicker pointer-events-auto" style={{ fontSize: u(2.6), color: "#e8862a" }} />
          <Editable editable={editable} value={slide.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display pointer-events-auto" style={{ fontSize: u((slide.title?.length ?? 0) > 22 ? 9.5 : 15), marginTop: u(2) }} />
        </div>
      </>
    );
  else if (slide.template === "photo")
    body = (
      <>
        {photoEl()}
        {m && (
          <div className="tb-kicker pointer-events-none absolute inset-x-0 bottom-0" style={{ padding: `${u(12)} ${u(5)} ${u(tall ? 26 : 4.5)}`, fontSize: u(2.1), color: "#f3eee4", background: "linear-gradient(to top, rgba(15,13,11,0.75), transparent)" }}>
            {shotCaption(m, trip)}
          </div>
        )}
      </>
    );
  else if (slide.template === "map") {
    const tracks = day ? day.groups.map((g) => ({ points: g.primary.points })) : allTracks(a);
    const s = day ? day.stats : a.totals;
    body = (
      <div className="absolute inset-0 flex flex-col" style={{ padding: u(7), ...safe }}>
        <div className="tb-kicker" style={{ fontSize: u(2.4), color: "var(--pg-accent)" }}>{day ? `Day ${day.index}` : trip.location || trip.name}</div>
        <Editable editable={editable} value={slide.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u((slide.title?.length ?? 0) > 22 ? 7 : 10), marginTop: u(1.5) }} />
        <div className="min-h-0 flex-1" style={{ background: "var(--pg-panel)", borderRadius: u(2), margin: `${u(4)} 0`, overflow: "hidden" }}>
          <RouteArt theme={ctx.theme} tracks={tracks} aspect={tall ? 0.75 : ctx.aspect > 0.95 ? 1.5 : 1.05} units={trip.units} strokeScale={1.25} className="h-full w-full" />
        </div>
        <div className="grid grid-cols-3" style={{ gap: u(3) }}>
          <Num label="Distance" value={distVal(s.distanceKm, trip.units).toFixed(s.distanceKm >= 100 ? 0 : 1)} unit={distUnit(trip.units)} />
          <Num label="Climbed" value={Math.round(eleVal(s.elevGainM, trip.units)).toLocaleString("en-US")} unit={eleUnit(trip.units)} />
          <Num label="Moving" value={fmtDuration(s.movingSec)} />
        </div>
      </div>
    );
  } else if (slide.template === "stats") {
    const t = a.totals;
    const items: [string, string, string?][] = [
      ["Ride days", String(t.rideDays)],
      ["Distance", distVal(t.distanceKm, trip.units).toFixed(0), distUnit(trip.units)],
      ["Climbed", Math.round(eleVal(t.elevGainM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
      ["Descended", Math.round(eleVal(t.elevLossM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
      ["High point", Math.round(eleVal(t.maxEleM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
      ["In the saddle", fmtDuration(t.movingSec)],
    ];
    body = (
      <div className="absolute inset-0 flex flex-col" style={{ padding: u(7), ...safe }}>
        <div className="tb-kicker" style={{ fontSize: u(2.4), color: "var(--pg-accent)" }}>{trip.location || trip.name}</div>
        <Editable editable={editable} value={slide.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u(10), marginTop: u(1.5) }} />
        <div className="grid flex-1 grid-cols-2 content-center" style={{ gap: `${u(7)} ${u(4)}` }}>
          {items.map(([l, v, un]) => <Num key={l} label={l} value={v} unit={un} big />)}
        </div>
      </div>
    );
  } else if (slide.template === "outro" || slide.template === "quote")
    body = (
      <>
        {photoEl(0.68)}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: u(9), color: "#f3eee4" }}>
          <Editable editable={editable} value={slide.text ?? ""} onChange={(text) => onEdit?.({ text })} className="tb-display pointer-events-auto" style={{ fontSize: u(7.5), lineHeight: 1.15 }} />
          <div className="tb-kicker" style={{ fontSize: u(2), marginTop: u(6), opacity: 0.75 }}>theridestory.com</div>
        </div>
      </>
    );

  return (
    <div className={`tb-page theme-${ctx.theme} ${className}`} style={{ aspectRatio: String(ctx.aspect), ...style }}>
      <div className="tb-surface">{body}</div>
    </div>
  );
}

function Num({ label, value, unit, big = false }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div>
      <div className="tb-num" style={{ fontSize: u(big ? 12 : 6.4) }}>
        {value}
        {unit && <span style={{ fontSize: "0.4em", marginLeft: "0.25em", color: "var(--pg-mute)", fontWeight: 500 }}>{unit}</span>}
      </div>
      <div className="tb-kicker" style={{ fontSize: u(big ? 2.1 : 1.8), color: "var(--pg-mute)", marginTop: u(1.2) }}>{label}</div>
    </div>
  );
}
