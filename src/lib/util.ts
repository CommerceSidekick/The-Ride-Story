import type { Units } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

export const shortCode = (n = 8) => {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (v) => a[v % a.length]).join("");
};

export const RIDER_COLORS = ["#e8862a", "#2f8f7a", "#c2452d", "#4a78c2", "#b58a1b", "#8a5cc2", "#3d9a4b", "#c24a8a"];

const KM_MI = 0.621371;
const M_FT = 3.28084;

export const fmtDist = (km: number, u: Units, digits = 1) =>
  u === "metric" ? `${km.toFixed(km >= 100 ? 0 : digits)} km` : `${(km * KM_MI).toFixed(km * KM_MI >= 100 ? 0 : digits)} mi`;
export const distVal = (km: number, u: Units) => (u === "metric" ? km : km * KM_MI);
export const distUnit = (u: Units) => (u === "metric" ? "km" : "mi");
export const fmtEle = (m: number, u: Units) =>
  u === "metric" ? `${Math.round(m).toLocaleString("en-US")} m` : `${Math.round(m * M_FT).toLocaleString("en-US")} ft`;
export const eleVal = (m: number, u: Units) => (u === "metric" ? m : m * M_FT);
export const eleUnit = (u: Units) => (u === "metric" ? "m" : "ft");
export const fmtSpeed = (kmh: number, u: Units) =>
  u === "metric" ? `${kmh.toFixed(1)} km/h` : `${(kmh * KM_MI).toFixed(1)} mph`;

export const fmtDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
};

/** All "local" timestamps are wall-clock ms encoded as UTC, so format with timeZone UTC. */
export const fmtDate = (localMs: number, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(localMs));
export const fmtTime = (localMs: number) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(localMs));
export const dayKey = (localMs: number) => new Date(localMs).toISOString().slice(0, 10);
export const dayKeyToMs = (key: string) => Date.parse(key + "T00:00:00Z");

export const fmtDateRange = (startKey: string, endKey: string) => {
  const a = dayKeyToMs(startKey);
  const b = dayKeyToMs(endKey);
  const y = new Date(b).getUTCFullYear();
  if (startKey === endKey) return `${fmtDate(a, { month: "long", day: "numeric" })}, ${y}`;
  const sameMonth = startKey.slice(0, 7) === endKey.slice(0, 7);
  return sameMonth
    ? `${fmtDate(a, { month: "long", day: "numeric" })}–${new Date(b).getUTCDate()}, ${y}`
    : `${fmtDate(a, { month: "short", day: "numeric" })} – ${fmtDate(b, { month: "short", day: "numeric" })}, ${y}`;
};

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

export const joinNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : names.length === 2 ? names.join(" & ") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
