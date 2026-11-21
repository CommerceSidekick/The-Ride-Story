import { cumulativeKm } from "@/lib/geo";
import type { TrackPoint, Units } from "@/lib/types";
import { fmtDist, fmtEle } from "@/lib/util";

/** Elevation profile for one ride. Photo stops are drawn as ticks at their distance along the ride. */
export function Elevation({ points, units, marks = [], className = "" }: { points: TrackPoint[]; units: Units; marks?: number[]; className?: string }) {
  if (points.length < 2) return null;
  const cum = cumulativeKm(points);
  const total = cum[cum.length - 1] || 1;
  let lo = Infinity, hi = -Infinity;
  for (const p of points) { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[2]); }
  const span = Math.max(hi - lo, 20);
  const W = 1000, H = 200;
  const step = Math.max(1, Math.floor(points.length / 300));
  let line = "";
  for (let i = 0; i < points.length; i += step) {
    const x = (cum[i] / total) * W, y = H - 8 - ((points[i][2] - lo) / span) * (H - 24);
    line += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const lastY = H - 8 - ((points[points.length - 1][2] - lo) / span) * (H - 24);
  line += `L${W} ${lastY.toFixed(1)}`;
  const id = `el${Math.round(total * 1000)}${points.length}`;
  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pg-accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--pg-accent)" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W} ${H}L0 ${H}Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="var(--pg-accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {marks.map((km, i) => (
          <line key={i} x1={(km / total) * W} x2={(km / total) * W} y1={H - 26} y2={H} stroke="var(--pg-ink)" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.75" />
        ))}
      </svg>
      <div className="tb-kicker absolute left-0" style={{ top: "calc(var(--u) * -1.8)", fontSize: "calc(var(--u) * 0.9)", color: "var(--pg-mute)" }}>
        Elevation · {fmtEle(lo, units)} – {fmtEle(hi, units)} · {fmtDist(total, units)}
      </div>
    </div>
  );
}
