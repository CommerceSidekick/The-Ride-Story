import { boundsOf, haversine } from "@/lib/geo";
import type { TrackPoint } from "@/lib/types";

export type ArtTrack = { points: TrackPoint[]; color?: string; label?: string };

/** Concrete colours per theme. SVG attributes can't rely on CSS variables once a slide is rasterised to PNG. */
export const ART_COLORS = {
  loam: { bg: "#1b1916", ink: "#f3eee4", mute: "#a89f8f", accent: "#e8862a", line: "#3a362f" },
  paper: { bg: "#f5f0e6", ink: "#1f1c18", mute: "#857c6c", accent: "#b5462f", line: "#d8cfbe" },
  agave: { bg: "#1f3d35", ink: "#f2ecdc", mute: "#a3b8ae", accent: "#f0b34a", line: "#37584e" },
} as const;

/**
 * A route drawn as print-friendly vector art. No map tiles: it stays sharp at any size,
 * exports cleanly to PNG/PDF and needs no API key.
 */
export function RouteArt({
  tracks, dots = [], theme = "loam", aspect = 1.3, units = "metric", showScale = true, className = "", strokeScale = 1,
}: {
  tracks: ArtTrack[];
  dots?: { lat: number; lon: number }[];
  theme?: keyof typeof ART_COLORS;
  aspect?: number;
  units?: "metric" | "imperial";
  showScale?: boolean;
  className?: string;
  strokeScale?: number;
}) {
  const W = 1000, H = Math.round(1000 / aspect);
  const C = ART_COLORS[theme];
  const b = boundsOf(tracks.map((t) => t.points));
  if (!b) return <div className={className} />;
  const midLat = (b.minLat + b.maxLat) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const spanX = Math.max((b.maxLon - b.minLon) * k, 1e-5);
  const spanY = Math.max(b.maxLat - b.minLat, 1e-5);
  const pad = 70;
  const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const ox = (W - spanX * s) / 2, oy = (H - spanY * s) / 2;
  const px = (lat: number, lon: number): [number, number] => [ox + (lon - b.minLon) * k * s, oy + (b.maxLat - lat) * s];
  const path = (pts: TrackPoint[]) => {
    const step = Math.max(1, Math.floor(pts.length / 500));
    let d = "";
    for (let i = 0; i < pts.length; i += step) {
      const [x, y] = px(pts[i][0], pts[i][1]);
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    const [x, y] = px(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    return d + `L${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  // scale bar: a round distance close to 1/5 of the width
  const mPerUnit = haversine(midLat, b.minLon, midLat, b.minLon + 1 / k / s) || 1; // metres per viewBox unit
  const per = units === "metric" ? 1000 : 1609.34;
  const target = (W / 5) * mPerUnit / per;
  const nice = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100].reduce((p, c) => (Math.abs(c - target) < Math.abs(p - target) ? c : p));
  const barW = (nice * per) / mPerUnit;
  const sw = 7 * strokeScale;
  const grid = 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Route map">
      <g stroke={C.line} strokeWidth="1.2" opacity="0.7">
        {Array.from({ length: Math.floor(W / grid) + 1 }, (_, i) => <line key={`v${i}`} x1={i * grid} y1={0} x2={i * grid} y2={H} />)}
        {Array.from({ length: Math.floor(H / grid) + 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * grid} x2={W} y2={i * grid} />)}
      </g>
      {tracks.map((t, i) => (
        <path key={`g${i}`} d={path(t.points)} fill="none" stroke={t.color ?? C.accent} strokeWidth={sw * 3.2} strokeLinecap="round" strokeLinejoin="round" opacity="0.16" />
      ))}
      {tracks.map((t, i) => (
        <path key={`p${i}`} d={path(t.points)} fill="none" stroke={t.color ?? C.accent} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {dots.map((d, i) => {
        const [x, y] = px(d.lat, d.lon);
        return <circle key={`d${i}`} cx={x} cy={y} r={sw * 1.15} fill={C.bg} stroke={C.ink} strokeWidth={sw * 0.5} />;
      })}
      {tracks.map((t, i) => {
        const [sx, sy] = px(t.points[0][0], t.points[0][1]);
        const e = t.points[t.points.length - 1];
        const [ex, ey] = px(e[0], e[1]);
        return (
          <g key={`m${i}`}>
            <circle cx={sx} cy={sy} r={sw * 2} fill={C.bg} stroke={t.color ?? C.accent} strokeWidth={sw * 0.8} />
            <circle cx={ex} cy={ey} r={sw * 2} fill={C.ink} stroke={C.bg} strokeWidth={sw * 0.6} />
          </g>
        );
      })}
      {showScale && (
        <g transform={`translate(${W - barW - 36}, ${H - 34})`} fill={C.mute} stroke={C.mute}>
          <path d={`M0 -7V0H${barW}V-7`} fill="none" strokeWidth="2.5" />
          <text x={barW / 2} y={-12} textAnchor="middle" stroke="none" fontSize="22" fontFamily="ui-monospace, Menlo, monospace">
            {nice} {units === "metric" ? "km" : "mi"}
          </text>
        </g>
      )}
      <g transform="translate(40, 46)" fill={C.mute}>
        <path d="M0 -22L8 6L0 1L-8 6Z" />
        <text x="0" y="30" textAnchor="middle" fontSize="20" fontFamily="ui-monospace, Menlo, monospace">N</text>
      </g>
    </svg>
  );
}
