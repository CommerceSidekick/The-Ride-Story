"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Analysis } from "@/lib/analyze";
import { boundsOf } from "@/lib/geo";
import { DAY_COLORS } from "./BookPageView";

/** Interactive map of every ride and every located photo. Tiles: OpenFreeMap (OpenStreetMap data, no API key). */
export function TripMap({ a }: { a: Analysis }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!ref.current) return;
    let dead = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any;
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (dead) return;
        const tracks = a.days.flatMap((d) => d.groups.map((g) => ({ pts: g.primary.points, color: DAY_COLORS[(d.index - 1) % DAY_COLORS.length], name: g.primary.name, day: d.index })));
        const b = boundsOf(tracks.map((t) => t.pts));
        map = new maplibregl.Map({
          container: ref.current!,
          style: "https://tiles.openfreemap.org/styles/liberty",
          bounds: b ? [[b.minLon, b.minLat], [b.maxLon, b.maxLat]] : undefined,
          fitBoundsOptions: { padding: 60 },
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.on("error", (e: { error?: { message?: string } }) => { if (!map.isStyleLoaded()) setErr(e.error?.message ?? "Map tiles could not be loaded"); });
        map.on("load", () => {
          tracks.forEach((t, i) => {
            map.addSource(`r${i}`, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: t.pts.map((p) => [p[1], p[0]]) } } });
            map.addLayer({ id: `r${i}c`, type: "line", source: `r${i}`, paint: { "line-color": "#1b1916", "line-width": 7, "line-opacity": 0.55 }, layout: { "line-cap": "round", "line-join": "round" } });
            map.addLayer({ id: `r${i}`, type: "line", source: `r${i}`, paint: { "line-color": t.color, "line-width": 4 }, layout: { "line-cap": "round", "line-join": "round" } });
          });
          for (const m of a.days.flatMap((d) => d.media)) {
            if (m.hidden || m.plat == null || m.plon == null) continue;
            const el = document.createElement("div");
            el.style.cssText = `width:38px;height:38px;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);background:#333 center/cover url("${m.thumbUrl}");cursor:pointer`;
            const pop = new maplibregl.Popup({ offset: 22, maxWidth: "260px" }).setHTML(`<img src="${m.thumbUrl}" style="width:240px;border-radius:6px;display:block" />`);
            new maplibregl.Marker({ element: el }).setLngLat([m.plon, m.plat]).setPopup(pop).addTo(map);
          }
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Map could not start");
      }
    })();
    return () => { dead = true; map?.remove(); };
  }, [a]);
  return (
    <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-[#e2d9c8] bg-bone-2">
      <div ref={ref} className="absolute inset-0" />
      {err && <div className="absolute inset-x-4 top-4 rounded-lg bg-loam px-4 py-2 text-sm text-bone">Map background unavailable ({err}). Routes in the book and social posts are unaffected.</div>}
    </div>
  );
}
