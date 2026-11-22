"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { boundsOf, overallBearing } from "@/lib/geo";
import { ROUTE, TERRARIUM, terrainStyle } from "@/lib/terrain-style";
import type { TrackPoint } from "@/lib/types";

export type MapTrack = { id: string; points: TrackPoint[]; color?: string };
export type MapPhoto = { id: string; lat: number; lon: number; thumbUrl: string; trackId?: string };

export type Pad = { top: number; bottom: number; left: number; right: number };

export type MapController = {
  map: MLMap;
  /** Highlight one track (others dim) and frame it in 3D. */
  focusTrack: (id: string | null, opts?: { duration?: number; pitch?: number; padding?: Pad }) => void;
  /** Fill a track with colour up to `fraction` of its length (the ride "so far"). */
  setProgress: (id: string, fraction: number) => void;
  /** Fly close to a point, looking along `bearing`. */
  flyTo: (lat: number, lon: number, opts?: { zoom?: number; bearing?: number; pitch?: number; duration?: number; padding?: Pad }) => void;
  fitAll: (opts?: { duration?: number; pitch?: number; padding?: Pad }) => void;
  setActivePhoto: (id: string | null) => void;
  /** Show only these photo pins (null = all). */
  showPins: (ids: Set<string> | null) => void;
};

// One contour generator per page, shared by every map instance.
let contourUrl: Promise<string | undefined> | null = null;
async function setupContours(maplibregl: typeof import("maplibre-gl")) {
  if (!contourUrl)
    contourUrl = (async () => {
      try {
        const mlcontour = (await import("maplibre-contour")).default;
        const dem = new mlcontour.DemSource({ url: TERRARIUM, encoding: "terrarium", maxzoom: 13, worker: true, cacheSize: 120 });
        dem.setupMaplibre(maplibregl as never);
        return dem.contourProtocolUrl({
          thresholds: { 10: [200, 1000], 11: [100, 500], 12: [50, 250], 13: [25, 100], 14: [20, 100] },
          contourLayer: "contours", elevationKey: "ele", levelKey: "level",
        });
      } catch {
        return undefined; // contours are decoration; the map works without them
      }
    })();
  return contourUrl;
}

const NO_PHOTOS: MapPhoto[] = [];

export function TerrainMap({
  tracks, photos = NO_PHOTOS, className = "", interactive = true, onReady, preserveDrawingBuffer = false, initialPitch = 52, pixelRatio,
}: {
  tracks: MapTrack[];
  photos?: MapPhoto[];
  className?: string;
  interactive?: boolean;
  onReady?: (c: MapController) => void;
  preserveDrawingBuffer?: boolean;
  initialPitch?: number;
  pixelRatio?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  const ready = useRef(onReady);
  useEffect(() => { ready.current = onReady; }, [onReady]);

  useEffect(() => {
    if (!el.current) return;
    let dead = false;
    let map: MLMap | null = null;
    const markers = new Map<string, Marker>();
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
        const contours = await setupContours(maplibregl);
        if (dead || !el.current) return;
        const all = boundsOf(tracks.map((t) => t.points)) ?? boundsOf([photos.map((p) => [p.lat, p.lon, 0, 0] as TrackPoint)]);
        const center: [number, number] = all ? [(all.minLon + all.maxLon) / 2, (all.minLat + all.maxLat) / 2] : [0, 20];
        map = new maplibregl.Map({
          container: el.current,
          style: terrainStyle(contours),
          center, zoom: all ? 11 : 2, pitch: initialPitch, bearing: 0, maxPitch: 80,
          interactive,
          attributionControl: { compact: true },
          canvasContextAttributes: { preserveDrawingBuffer, antialias: true },
          fadeDuration: 200,
          ...(pixelRatio ? { pixelRatio } : {}),
        });
        (window as unknown as { __trsMap?: MLMap }).__trsMap = map; // handy for debugging and automated checks
        if (interactive) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
        map.on("error", (e) => {
          const ev = e as unknown as { sourceId?: string; tile?: unknown };
          if (ev.sourceId || ev.tile) return; // a slow or missing tile is not a broken map
          if (map && !map.getStyle()) setErr((e as unknown as { error?: { message?: string } }).error?.message ?? "Map failed to load"); });

        const basePad: Pad = { top: 90, bottom: 110, left: 70, right: 70 };
        const frame = (pts: TrackPoint[][], duration: number, pitch: number, bearing?: number, padding: Pad = basePad) => {
          const b = boundsOf(pts);
          if (!b || !map) return;
          const cam = map.cameraForBounds([[b.minLon, b.minLat], [b.maxLon, b.maxLat]], { padding, bearing: bearing ?? 0 });
          if (!cam) return;
          map.flyTo({ center: cam.center, zoom: Math.min((cam.zoom ?? 12) - 0.35, 15), bearing: bearing ?? 0, pitch, duration, essential: true, curve: 1.3 });
        };

        const init = () => {
          if (!map || map.getSource(tracks[0] ? `trk-${tracks[0].id}` : "__none")) return;
          for (const t of tracks) {
            map.addSource(`trk-${t.id}`, {
              type: "geojson", lineMetrics: true,
              data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: t.points.map((p) => [p[1], p[0], p[2]]) } },
            });
            const color = t.color ?? ROUTE.flame;
            map.addLayer({ id: `trk-${t.id}-glow`, type: "line", source: `trk-${t.id}`, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": color, "line-width": 12, "line-blur": 8, "line-opacity": 0.45 } });
            map.addLayer({ id: `trk-${t.id}-case`, type: "line", source: `trk-${t.id}`, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0e0f0c", "line-width": 6, "line-opacity": 0.55 } });
            map.addLayer({ id: `trk-${t.id}`, type: "line", source: `trk-${t.id}`, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": color, "line-width": 3.4 } });
          }
          for (const p of photos) {
            const node = document.createElement("button");
            node.type = "button";
            node.className = "trs-pin";
            node.style.backgroundImage = `url("${p.thumbUrl}")`;
            node.setAttribute("aria-label", "Photo location");
            markers.set(p.id, new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([p.lon, p.lat]).addTo(map));
          }

          const colorOf = (id: string) => tracks.find((t) => t.id === id)?.color ?? ROUTE.flame;
          const controller: MapController = {
            map,
            focusTrack: (id, o = {}) => {
              for (const t of tracks) {
                const on = id === null || t.id === id;
                map!.setPaintProperty(`trk-${t.id}`, "line-opacity", on ? 1 : 0.35);
                map!.setPaintProperty(`trk-${t.id}-glow`, "line-opacity", on ? 0.45 : 0);
                map!.setPaintProperty(`trk-${t.id}`, "line-width", on ? 3.4 : 2);
              }
              const t = tracks.find((x) => x.id === id);
              if (t) frame([t.points], o.duration ?? 2600, o.pitch ?? 58, overallBearing(t.points) - 20, o.padding);
              else frame(tracks.map((x) => x.points), o.duration ?? 2600, o.pitch ?? 45, 0, o.padding);
            },
            setProgress: (id, f) => {
              const c = colorOf(id);
              const x = Math.min(0.9999, Math.max(0.0001, f));
              map!.setPaintProperty(`trk-${id}`, "line-gradient", ["interpolate", ["linear"], ["line-progress"], 0, c, x, c, Math.min(1, x + 0.0001), ROUTE.dim, 1, ROUTE.dim]);
            },
            flyTo: (lat, lon, o = {}) => map!.flyTo({ center: [lon, lat], zoom: o.zoom ?? 14.2, bearing: o.bearing ?? map!.getBearing(), pitch: o.pitch ?? 66, duration: o.duration ?? 2800, essential: true, curve: 1.2, padding: o.padding ?? { top: 0, bottom: 0, left: 0, right: 0 } }),
            fitAll: (o = {}) => frame(tracks.map((x) => x.points), o.duration ?? 2400, o.pitch ?? 45, 0, o.padding),
            setActivePhoto: (id) => markers.forEach((m, k) => m.getElement().classList.toggle("is-active", k === id)),
            showPins: (ids) => markers.forEach((m, k) => { m.getElement().style.visibility = ids === null || ids.has(k) ? "visible" : "hidden"; }),
          };
          if (tracks.length) frame(tracks.map((x) => x.points), 0, initialPitch);
          // Hand over control once the first frame is drawn; don't wait for every terrain tile.
          let handed = false;
          const hand = () => { if (!handed && !dead) { handed = true; ready.current?.(controller); } };
          map.once("idle", hand);
          setTimeout(hand, 2500);
        };
        if (map.isStyleLoaded()) init();
        else map.once("style.load", init);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Map failed to start");
      }
    })();
    return () => { dead = true; markers.forEach((m) => m.remove()); map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, photos]);

  return (
    <div className={`relative overflow-hidden bg-[#0e0f0c] ${className}`}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {err && <div className="absolute inset-x-4 top-4 rounded-lg bg-black/70 px-4 py-2 text-sm text-[#f2eee6]">Map unavailable ({err}).</div>}
    </div>
  );
}
