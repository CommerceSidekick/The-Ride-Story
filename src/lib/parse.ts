import type { TrackPoint } from "./types";

export type ParsedTrack = { name: string; points: TrackPoint[]; source: "gpx" | "tcx" | "fit" };

const num = (s: string | null | undefined) => {
  const v = s == null ? NaN : parseFloat(s);
  return Number.isFinite(v) ? v : NaN;
};
const first = (el: Element, tag: string) => el.getElementsByTagNameNS("*", tag)[0] ?? null;
const validLL = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);

export function parseGpx(xml: string, fallbackName: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Not a valid GPX file");
  const pts: TrackPoint[] = [];
  let nodes = Array.from(doc.getElementsByTagNameNS("*", "trkpt"));
  if (!nodes.length) nodes = Array.from(doc.getElementsByTagNameNS("*", "rtept"));
  for (const n of nodes) {
    const lat = num(n.getAttribute("lat")), lon = num(n.getAttribute("lon"));
    if (!validLL(lat, lon)) continue;
    const ele = num(first(n, "ele")?.textContent);
    const t = Date.parse(first(n, "time")?.textContent ?? "");
    pts.push([lat, lon, Number.isFinite(ele) ? ele : 0, Number.isFinite(t) ? t / 1000 : 0]);
  }
  if (pts.length < 2) throw new Error("No track points found in GPX");
  const trk = doc.getElementsByTagNameNS("*", "trk")[0];
  const name = (trk && first(trk, "name")?.textContent?.trim()) || fallbackName;
  return { name, points: pts, source: "gpx" };
}

export function parseTcx(xml: string, fallbackName: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Not a valid TCX file");
  const pts: TrackPoint[] = [];
  for (const n of Array.from(doc.getElementsByTagNameNS("*", "Trackpoint"))) {
    const pos = first(n, "Position");
    if (!pos) continue;
    const lat = num(first(pos, "LatitudeDegrees")?.textContent), lon = num(first(pos, "LongitudeDegrees")?.textContent);
    if (!validLL(lat, lon)) continue;
    const ele = num(first(n, "AltitudeMeters")?.textContent);
    const t = Date.parse(first(n, "Time")?.textContent ?? "");
    pts.push([lat, lon, Number.isFinite(ele) ? ele : 0, Number.isFinite(t) ? t / 1000 : 0]);
  }
  if (pts.length < 2) throw new Error("No track points found in TCX");
  return { name: fallbackName, points: pts, source: "tcx" };
}

export async function parseFit(buf: ArrayBuffer, fallbackName: string): Promise<ParsedTrack> {
  const { default: FitParser } = await import("fit-file-parser");
  const parser = new FitParser({ force: true, lengthUnit: "m", speedUnit: "km/h", mode: "list" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await parser.parseAsync(buf);
  const pts: TrackPoint[] = [];
  for (const r of data.records ?? []) {
    const lat = r.position_lat, lon = r.position_long;
    if (!validLL(lat, lon)) continue;
    const ele = r.enhanced_altitude ?? r.altitude ?? 0;
    const t = r.timestamp ? new Date(r.timestamp).getTime() / 1000 : 0;
    pts.push([lat, lon, Number.isFinite(ele) ? ele : 0, Number.isFinite(t) ? t : 0]);
  }
  if (pts.length < 2) throw new Error("No GPS records found in FIT file");
  return { name: fallbackName, points: pts, source: "fit" };
}

export const isTrackFile = (name: string) => /\.(gpx|tcx|fit)$/i.test(name);

export async function parseTrackFile(file: File): Promise<ParsedTrack> {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "gpx") return parseGpx(await file.text(), base);
  if (ext === "tcx") return parseTcx(await file.text(), base);
  if (ext === "fit") return parseFit(await file.arrayBuffer(), base);
  throw new Error(`Unsupported ride file: ${file.name}`);
}
