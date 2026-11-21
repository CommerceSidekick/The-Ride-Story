"use client";
import { useEffect, useRef, useState } from "react";
import type { Analysis, Day, MediaX } from "@/lib/analyze";
import type { BookPage, BookTheme, Trip } from "@/lib/types";
import { fmtDist, fmtDuration, fmtEle, fmtSpeed, fmtTime, joinNames, distVal, distUnit, eleVal, eleUnit } from "@/lib/util";
import { Elevation } from "./Elevation";
import { RouteArt, type ArtTrack } from "./RouteArt";

export const DAY_COLORS = ["#e8862a", "#4fa58f", "#d4583e", "#6b93d6", "#d6b23e", "#a17bd6", "#5fb85f", "#d66ba8"];

const u = (n: number) => `calc(var(--u) * ${n})`;

export function Editable({
  value, onChange, editable, className = "", style,
}: { value: string; onChange?: (v: string) => void; editable: boolean; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  return (
    <div
      ref={ref}
      className={className}
      style={{ whiteSpace: "pre-wrap", ...style }}
      contentEditable={editable && !!onChange}
      suppressContentEditableWarning
      spellCheck={editable}
      onBlur={(e) => {
        const v = e.currentTarget.innerText.replace(/\n{3,}/g, "\n\n").trim();
        // Kickers render uppercase via CSS and innerText reports them that way; ignore case-only "changes".
        if (v.toLowerCase() !== value.toLowerCase() || (v !== value && v !== value.toUpperCase())) onChange?.(v);
      }}
    />
  );
}

export function shotCaption(m: MediaX, trip: Trip) {
  const who = trip.crew.find((c) => c.id === m.riderId)?.name;
  return [
    m.caption,
    m.localMs != null ? fmtTime(m.localMs) : null,
    m.km != null ? `${distUnit(trip.units)} ${distVal(m.km, trip.units).toFixed(1)}` : null,
    m.ele != null ? fmtEle(m.ele, trip.units) : null,
    who ? `by ${who}` : null,
  ].filter(Boolean).join(" · ");
}

function Shot({
  m, trip, onClick, caption = "below", className = "", style,
}: { m: MediaX | undefined; trip: Trip; onClick?: () => void; caption?: "below" | "none"; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`flex min-h-0 min-w-0 flex-col ${className}`} style={style}>
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ background: "var(--pg-panel)", borderRadius: u(0.4), cursor: onClick ? "pointer" : undefined }}
        onClick={onClick}
        title={onClick ? "Click to swap photo" : undefined}
      >
        {m ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.url} alt={m.caption ?? ""} crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="tb-kicker absolute inset-0 grid place-items-center" style={{ fontSize: u(1.1), color: "var(--pg-mute)" }}>
            {onClick ? "Choose a photo" : ""}
          </div>
        )}
        {m?.kind === "video" && <PlayBadge />}
      </div>
      {caption === "below" && m && (
        <div className="tb-kicker shrink-0 truncate" style={{ fontSize: u(0.9), color: "var(--pg-mute)", paddingTop: u(0.7) }}>
          {shotCaption(m, trip)}
        </div>
      )}
    </div>
  );
}

const PlayBadge = () => (
  <div className="absolute grid place-items-center rounded-full" style={{ right: u(1.2), top: u(1.2), width: u(4), height: u(4), background: "rgba(0,0,0,0.55)" }}>
    <svg viewBox="0 0 24 24" style={{ width: u(2), height: u(2) }} fill="#fff"><path d="M8 5v14l11-7z" /></svg>
  </div>
);

function Stat({ label, value, unit, big = false }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div>
      <div className="tb-num" style={{ fontSize: u(big ? 7 : 3.1) }}>
        {value}
        {unit && <span style={{ fontSize: "0.42em", marginLeft: "0.25em", color: "var(--pg-mute)", fontWeight: 500 }}>{unit}</span>}
      </div>
      <div className="tb-kicker" style={{ fontSize: u(big ? 1.05 : 0.85), color: "var(--pg-mute)", marginTop: u(big ? 0.9 : 0.5) }}>{label}</div>
    </div>
  );
}

function QR({ url }: { url: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    import("qrcode").then((q) => q.toDataURL(url, { margin: 1, width: 400, color: { dark: "#1b1916", light: "#f3eee4" } })).then((d) => live && setSrc(d));
    return () => { live = false; };
  }, [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR code to the online book" style={{ width: u(11), height: u(11), borderRadius: u(0.6) }} /> : null;
}

const splitStat = (s: string) => {
  if (/^\d+h \d+m$/.test(s)) return [s, ""];
  const i = s.lastIndexOf(" ");
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
};

export type PageCtx = {
  trip: Trip;
  a: Analysis;
  theme: BookTheme;
  aspect: number;
  editable?: boolean;
  onEdit?: (patch: Partial<BookPage>) => void;
  onPickPhoto?: (slot: number) => void;
  pageNo?: number;
  publishedUrl?: string | null;
};

export function BookPageView({ page, ctx, className = "", style }: { page: BookPage; ctx: PageCtx; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`tb-page theme-${ctx.theme} ${className}`} style={{ aspectRatio: String(ctx.aspect), ...style }}>
      <div className="tb-surface">
        <Body page={page} ctx={ctx} />
        {ctx.pageNo != null && !["cover", "back"].includes(page.type) && !(page.type === "photos" && page.photoIds.length === 1) && (
          <div className="tb-kicker absolute" style={{ right: u(3), bottom: u(1.5), fontSize: u(0.8), color: "var(--pg-mute)" }}>{ctx.pageNo}</div>
        )}
      </div>
    </div>
  );
}

function Body({ page, ctx }: { page: BookPage; ctx: PageCtx }) {
  const { trip, a, editable = false, onEdit, onPickPhoto } = ctx;
  const photo = (i: number) => a.mediaById.get(page.photoIds[i]);
  const pick = (i: number) => (editable && onPickPhoto ? () => onPickPhoto(i) : undefined);
  const day: Day | undefined = page.date ? a.days.find((d) => d.date === page.date) : undefined;
  const square = ctx.aspect < 1.1;
  const t = a.totals;

  switch (page.type) {
    case "cover": {
      const m = photo(0);
      return (
        <>
          <div className="absolute inset-0" onClick={pick(0)} style={{ cursor: pick(0) ? "pointer" : undefined }} title={pick(0) ? "Click to change cover photo" : undefined}>
            {m ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt="" crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <RouteArt theme={ctx.theme} tracks={allTracks(a)} aspect={ctx.aspect} showScale={false} className="absolute inset-0 h-full w-full opacity-60" />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.88) 0%, rgba(15,13,11,0.25) 45%, rgba(15,13,11,0.05) 100%)" }} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ padding: u(5), color: "#f3eee4" }}>
            <Editable editable={editable} value={page.kicker ?? ""} onChange={(kicker) => onEdit?.({ kicker })} className="tb-kicker pointer-events-auto" style={{ fontSize: u(1.25), color: "#e8862a" }} />
            <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display pointer-events-auto" style={{ fontSize: u(square ? 12 : 11), marginTop: u(1.2) }} />
            {trip.crew.length > 0 && (
              <div style={{ fontSize: u(1.5), marginTop: u(1.8), opacity: 0.85 }}>{joinNames(trip.crew.map((c) => c.name))}</div>
            )}
          </div>
        </>
      );
    }

    case "overview":
      return (
        <div className="absolute inset-0 flex" style={{ padding: u(5), gap: u(4), flexDirection: square ? "column" : "row" }}>
          <div className="flex min-h-0 flex-col" style={{ width: square ? "100%" : "40%" }}>
            <div className="tb-kicker" style={{ fontSize: u(1.05), color: "var(--pg-accent)" }}>{trip.location || "Overview"}</div>
            <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u(6), marginTop: u(1) }} />
            <Editable editable={editable} value={page.text ?? ""} onChange={(text) => onEdit?.({ text })} className="min-h-0 flex-1 overflow-hidden" style={{ fontSize: u(1.5), lineHeight: 1.6, marginTop: u(2.2) }} />
            <div className="grid grid-cols-3" style={{ gap: u(2), marginTop: u(2), paddingTop: u(2), borderTop: "1px solid var(--pg-line)" }}>
              <Stat label="Ride days" value={String(t.rideDays)} />
              <Stat label="Distance" value={distVal(t.distanceKm, trip.units).toFixed(0)} unit={distUnit(trip.units)} />
              <Stat label="Climbing" value={Math.round(eleVal(t.elevGainM, trip.units)).toLocaleString("en-US")} unit={eleUnit(trip.units)} />
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col" style={{ background: "var(--pg-panel)", borderRadius: u(0.8), overflow: "hidden" }}>
            <RouteArt theme={ctx.theme} tracks={allTracks(a)} aspect={square ? 1.6 : 0.95} units={trip.units} className="min-h-0 w-full flex-1" />
            <div className="flex flex-wrap" style={{ gap: `${u(0.6)} ${u(2)}`, padding: `${u(1.2)} ${u(2)} ${u(1.6)}` }}>
              {a.days.filter((d) => d.groups.length).map((d) => (
                <div key={d.date} className="tb-kicker flex items-center" style={{ fontSize: u(0.9), gap: u(0.6), color: "var(--pg-mute)" }}>
                  <span style={{ width: u(1.6), height: u(0.45), borderRadius: 99, background: DAY_COLORS[(d.index - 1) % DAY_COLORS.length] }} />
                  Day {d.index}
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "crew":
      return (
        <div className="absolute inset-0 flex flex-col" style={{ padding: u(5) }}>
          <div className="tb-kicker" style={{ fontSize: u(1.05), color: "var(--pg-accent)" }}>Who came</div>
          <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u(6), marginTop: u(1) }} />
          <div className="grid min-h-0 flex-1 content-start" style={{ gridTemplateColumns: `repeat(${square ? 2 : Math.min(4, Math.max(2, a.riderStats.length))}, 1fr)`, gap: u(2), marginTop: u(3.5) }}>
            {a.riderStats.slice(0, 8).map((r) => (
              <div key={r.rider.id} style={{ background: "var(--pg-panel)", borderRadius: u(0.8), padding: u(2.6), paddingBottom: u(3.2), borderTop: `${u(0.5)} solid ${r.rider.color}` }}>
                <div className="tb-display" style={{ fontSize: u(3.6) }}>{r.rider.name}</div>
                <div className="tb-kicker" style={{ fontSize: u(1.15), color: "var(--pg-mute)", marginTop: u(1.8), lineHeight: 2.1 }}>
                  {r.rides > 0 ? (
                    <>
                      <div>{fmtDist(r.distanceKm, trip.units, 0)} ridden</div>
                      <div>{fmtEle(r.elevGainM, trip.units)} climbed</div>
                      <div>{fmtDuration(r.movingSec)} moving</div>
                    </>
                  ) : (
                    <div>No ride file</div>
                  )}
                  <div>{r.photos} {r.photos === 1 ? "shot" : "shots"}</div>
                </div>
              </div>
            ))}
          </div>
          {a.awards.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: `${u(1.2)} ${u(4)}`, paddingTop: u(2), borderTop: "1px solid var(--pg-line)" }}>
              {a.awards.map((w) => (
                <div key={w.label}>
                  <div className="tb-kicker" style={{ fontSize: u(0.85), color: "var(--pg-accent)" }}>{w.label}</div>
                  <div style={{ fontSize: u(1.5), marginTop: u(0.3) }}>
                    <b>{w.name}</b> <span style={{ color: "var(--pg-mute)" }}>· {w.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "day": {
      if (!day) return <Missing />;
      const tracks: ArtTrack[] = day.groups.map((g) => ({ points: g.primary.points }));
      const mainGroup = [...day.groups].sort((x, y) => y.primary.stats.distanceKm - x.primary.stats.distanceKm)[0];
      const main = mainGroup?.primary;
      const groupIds = new Set(mainGroup?.rides.map((r) => r.id));
      const dots = day.media.filter((m) => !m.hidden && m.plat != null && m.plon != null && m.rideId).map((m) => ({ lat: m.plat!, lon: m.plon! }));
      const marks = main ? day.media.filter((m) => !m.hidden && groupIds.has(m.rideId ?? "") && m.km != null).map((m) => m.km!) : [];
      const s = day.stats;
      const stats = main
        ? [
            ["Distance", fmtDist(s.distanceKm, trip.units)], ["Climbing", fmtEle(s.elevGainM, trip.units)], ["Descending", fmtEle(s.elevLossM, trip.units)],
            ["Moving time", fmtDuration(s.movingSec)], ["High point", fmtEle(s.maxEleM, trip.units)], ["Top speed", fmtSpeed(s.maxSpeedKmh, trip.units)],
          ]
        : [];
      return (
        <div className="absolute inset-0 flex flex-col" style={{ padding: u(5), paddingBottom: u(4.5) }}>
          <div className="flex min-h-0 flex-1" style={{ gap: u(4), flexDirection: square ? "column" : "row" }}>
            <div className="flex min-h-0 flex-col" style={{ width: square ? "100%" : "42%" }}>
              <Editable editable={editable} value={page.kicker ?? ""} onChange={(kicker) => onEdit?.({ kicker })} className="tb-kicker" style={{ fontSize: u(1.05), color: "var(--pg-accent)" }} />
              <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u(4.6), marginTop: u(1) }} />
              <Editable editable={editable} value={page.text ?? ""} onChange={(text) => onEdit?.({ text })} className="min-h-0 flex-1 overflow-hidden" style={{ fontSize: u(1.45), lineHeight: 1.6, marginTop: u(2) }} />
              {stats.length > 0 && (
                <div className="grid grid-cols-3" style={{ gap: `${u(1.8)} ${u(1.5)}`, marginTop: u(2), paddingTop: u(2), borderTop: "1px solid var(--pg-line)" }}>
                  {stats.map(([l, v]) => { const [n, un] = splitStat(v); return <Stat key={l} label={l} value={n} unit={un} />; })}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1" style={{ background: "var(--pg-panel)", borderRadius: u(0.8), overflow: "hidden" }}>
              {tracks.length ? (
                <RouteArt theme={ctx.theme} tracks={tracks} dots={dots} aspect={square ? 1.8 : 1.15} units={trip.units} className="h-full w-full" />
              ) : (
                <Shot m={day.media.find((m) => !m.hidden)} trip={trip} caption="none" className="h-full" />
              )}
            </div>
          </div>
          {main && (
            <div className="shrink-0" style={{ height: u(9), marginTop: u(3) }}>
              <Elevation points={main.points} units={trip.units} marks={marks} className="h-full" />
            </div>
          )}
        </div>
      );
    }

    case "photos": {
      const n = page.photoIds.length;
      if (n <= 1) {
        const m = photo(0);
        return (
          <>
            <Shot m={m} trip={trip} onClick={pick(0)} caption="none" className="absolute inset-0 [&>div]:!rounded-none" />
            {m && (
              <div className="tb-kicker pointer-events-none absolute inset-x-0 bottom-0" style={{ padding: `${u(5)} ${u(3)} ${u(2)}`, fontSize: u(0.95), color: "#f3eee4", background: "linear-gradient(to top, rgba(15,13,11,0.7), transparent)" }}>
                {shotCaption(m, trip)}
              </div>
            )}
          </>
        );
      }
      const pad = { padding: u(3.5), gap: u(1.6) };
      if (n === 2)
        return (
          <div className="absolute inset-0 flex" style={{ ...pad, flexDirection: square ? "column" : "row" }}>
            <Shot m={photo(0)} trip={trip} onClick={pick(0)} style={{ flex: 1.35 }} />
            <Shot m={photo(1)} trip={trip} onClick={pick(1)} style={{ flex: 1 }} />
          </div>
        );
      if (n === 3)
        return (
          <div className="absolute inset-0 flex" style={pad}>
            <Shot m={photo(0)} trip={trip} onClick={pick(0)} style={{ flex: 1.6 }} />
            <div className="flex min-h-0 flex-1 flex-col" style={{ gap: u(1.6) }}>
              <Shot m={photo(1)} trip={trip} onClick={pick(1)} className="flex-1" />
              <Shot m={photo(2)} trip={trip} onClick={pick(2)} className="flex-1" />
            </div>
          </div>
        );
      return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2" style={pad}>
          {page.photoIds.slice(0, 4).map((id, i) => <Shot key={id + i} m={photo(i)} trip={trip} onClick={pick(i)} />)}
        </div>
      );
    }

    case "story":
      return (
        <div className="absolute inset-0 flex" style={{ flexDirection: square ? "column" : "row" }}>
          <Shot m={photo(0)} trip={trip} onClick={pick(0)} caption="none" className="[&>div]:!rounded-none" style={{ flex: 1.25 }} />
          <div className="flex min-h-0 flex-1 flex-col justify-center" style={{ padding: u(5) }}>
            <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-kicker" style={{ fontSize: u(1.05), color: "var(--pg-accent)" }} />
            <Editable editable={editable} value={page.text ?? ""} onChange={(text) => onEdit?.({ text })} className="tb-display overflow-hidden" style={{ fontSize: u(2.5), lineHeight: 1.35, fontWeight: 500, marginTop: u(2) }} />
            {photo(0) && <div className="tb-kicker" style={{ fontSize: u(0.9), color: "var(--pg-mute)", marginTop: u(3) }}>{shotCaption(photo(0)!, trip)}</div>}
          </div>
        </div>
      );

    case "numbers": {
      const items: [string, string, string?][] = [
        ["Distance", distVal(t.distanceKm, trip.units).toFixed(0), distUnit(trip.units)],
        ["Climbed", Math.round(eleVal(t.elevGainM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
        ["Descended", Math.round(eleVal(t.elevLossM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
        ["In the saddle", fmtDuration(t.movingSec)],
        ["Highest point", Math.round(eleVal(t.maxEleM, trip.units)).toLocaleString("en-US"), eleUnit(trip.units)],
        ["Photos & clips", String(t.photos + t.videos)],
      ];
      return (
        <div className="absolute inset-0 flex flex-col" style={{ padding: u(5) }}>
          <div className="tb-kicker" style={{ fontSize: u(1.05), color: "var(--pg-accent)" }}>{t.rideDays} ride days · {t.outings} {t.outings === 1 ? "ride" : "rides"}</div>
          <Editable editable={editable} value={page.title ?? ""} onChange={(title) => onEdit?.({ title })} className="tb-display" style={{ fontSize: u(6), marginTop: u(1) }} />
          <div className="grid flex-1 content-center" style={{ gridTemplateColumns: `repeat(${square ? 2 : 3}, 1fr)`, gap: `${u(5)} ${u(3)}` }}>
            {items.map(([l, v, un]) => <Stat key={l} label={l} value={v} unit={un} big />)}
          </div>
        </div>
      );
    }

    case "back": {
      const m = photo(0);
      return (
        <>
          {m && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt="" crossOrigin="anonymous" className="absolute inset-0 h-full w-full object-cover" onClick={pick(0)} style={{ cursor: pick(0) ? "pointer" : undefined }} />
          )}
          <div className="pointer-events-none absolute inset-0" style={{ background: m ? "rgba(15,13,11,0.72)" : "transparent" }} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: u(8), color: m ? "#f3eee4" : "var(--pg-ink)" }}>
            <Editable editable={editable} value={page.text ?? ""} onChange={(text) => onEdit?.({ text })} className="tb-display pointer-events-auto" style={{ fontSize: u(4.2), lineHeight: 1.2, maxWidth: "80%" }} />
            {ctx.publishedUrl && (
              <div className="flex flex-col items-center" style={{ marginTop: u(4), gap: u(1.2) }}>
                <QR url={ctx.publishedUrl} />
                <div className="tb-kicker" style={{ fontSize: u(0.85), opacity: 0.8 }}>Scan for the full story, clips included</div>
              </div>
            )}
          </div>
          <div className="tb-kicker pointer-events-none absolute inset-x-0 text-center" style={{ bottom: u(3), fontSize: u(0.8), color: m ? "#f3eee4" : "var(--pg-mute)", opacity: 0.7 }}>
            theridestory.com
          </div>
        </>
      );
    }
  }
  return <Missing />;
}

const Missing = () => (
  <div className="tb-kicker absolute inset-0 grid place-items-center" style={{ fontSize: u(1.2), color: "var(--pg-mute)" }}>
    This day no longer has any data — remove the page or regenerate the book.
  </div>
);

export function allTracks(a: Analysis): ArtTrack[] {
  return a.days.flatMap((d) => d.groups.map((g) => ({ points: g.primary.points, color: DAY_COLORS[(d.index - 1) % DAY_COLORS.length] })));
}
