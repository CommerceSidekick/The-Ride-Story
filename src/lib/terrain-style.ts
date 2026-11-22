import type { StyleSpecification } from "maplibre-gl";

/**
 * The Ride Story map: satellite imagery graded dark, real 3D terrain, hillshade, contours, the trail
 * network and peak labels. Every source is free to use commercially and in print with attribution,
 * and none needs an API key:
 *  - Imagery: EOxCloudless 2016 (Sentinel-2), CC BY 4.0
 *  - Elevation: Terrain Tiles on AWS (Mapzen terrarium encoding), open data with attribution
 *  - Trails, places, peaks: OpenStreetMap via OpenFreeMap (ODbL)
 */
export const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const IMAGERY = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";

export const ATTRIBUTION =
  '<a href="https://cloudless.eox.at" target="_blank" rel="noreferrer">EOxCloudless 2016</a> (Contains modified Copernicus Sentinel data 2016) · ' +
  'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">AWS Terrain Tiles</a> · ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · ' +
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>';

/** Plain-text credit for printed pages. */
export const PRINT_CREDIT =
  "Imagery: EOxCloudless 2016 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2016), CC BY 4.0. Terrain: AWS Terrain Tiles. Map data © OpenStreetMap contributors.";

const INK = "#f2eee6";
const CARBON = "#0e0f0c";

export function terrainStyle(contourTilesUrl?: string): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      imagery: { type: "raster", tiles: [IMAGERY], tileSize: 256, maxzoom: 14, attribution: ATTRIBUTION },
      dem: { type: "raster-dem", tiles: [TERRARIUM], tileSize: 256, maxzoom: 15, encoding: "terrarium" },
      shade: { type: "raster-dem", tiles: [TERRARIUM], tileSize: 256, maxzoom: 15, encoding: "terrarium" },
      osm: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
      ...(contourTilesUrl ? { contours: { type: "vector" as const, tiles: [contourTilesUrl], maxzoom: 15 } } : {}),
    },
    sky: {
      "sky-color": "#16202a",
      "horizon-color": "#3b4652",
      "fog-color": "#0e0f0c",
      "sky-horizon-blend": 0.65,
      "horizon-fog-blend": 0.55,
      "fog-ground-blend": 0.35,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0.6, 15, 0.2],
    },
    terrain: { source: "dem", exaggeration: 1.6 },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": CARBON } },
      {
        id: "imagery", type: "raster", source: "imagery",
        paint: { "raster-saturation": -0.12, "raster-contrast": 0.18, "raster-brightness-max": 1, "raster-brightness-min": 0.02, "raster-fade-duration": 250 },
      },
      {
        id: "hillshade", type: "hillshade", source: "shade",
        paint: { "hillshade-exaggeration": 0.62, "hillshade-shadow-color": "rgba(14,15,12,0.8)", "hillshade-highlight-color": "rgba(255,240,214,0.2)", "hillshade-accent-color": "rgba(14,15,12,0.35)", "hillshade-illumination-direction": 315 },
      },
      ...(contourTilesUrl
        ? ([
            {
              id: "contours", type: "line", source: "contours", "source-layer": "contours",
              paint: {
                "line-color": INK,
                "line-opacity": ["match", ["get", "level"], 1, 0.26, 0.11],
                "line-width": ["match", ["get", "level"], 1, 0.9, 0.5],
              },
            },
            {
              id: "contour-labels", type: "symbol", source: "contours", "source-layer": "contours",
              filter: ["==", ["get", "level"], 1], minzoom: 13,
              layout: {
                "symbol-placement": "line", "text-size": 10, "text-field": ["concat", ["number-format", ["get", "ele"], {}], " m"],
                "text-font": ["Noto Sans Regular"], "text-letter-spacing": 0.08,
              },
              paint: { "text-color": INK, "text-opacity": 0.45, "text-halo-color": CARBON, "text-halo-width": 1.2 },
            },
          ] as StyleSpecification["layers"])
        : []),
      {
        id: "water-lines", type: "line", source: "osm", "source-layer": "waterway", minzoom: 11,
        paint: { "line-color": "#8fb8c9", "line-opacity": 0.35, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 15, 1.4] },
      },
      {
        id: "roads", type: "line", source: "osm", "source-layer": "transportation", minzoom: 9,
        filter: ["match", ["get", "class"], ["primary", "secondary", "tertiary", "trunk", "motorway"], true, false],
        paint: { "line-color": INK, "line-opacity": 0.22, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.4, 15, 1.6] },
      },
      {
        id: "tracks", type: "line", source: "osm", "source-layer": "transportation", minzoom: 12,
        filter: ["match", ["get", "class"], ["track", "path", "minor", "service"], true, false],
        layout: { "line-cap": "round" },
        paint: { "line-color": INK, "line-opacity": 0.3, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 16, 1.2], "line-dasharray": [2, 2] },
      },
      {
        id: "peaks", type: "symbol", source: "osm", "source-layer": "mountain_peak", minzoom: 11.5,
        filter: ["has", "name"],
        layout: {
          "text-field": ["format", "▲ ", {}, ["get", "name"], {}, ["case", ["has", "ele"], ["concat", "\n", ["number-format", ["get", "ele"], {}], " m"], ""], { "font-scale": 0.8 }],
          "text-font": ["Noto Sans Regular"], "text-size": 10, "text-anchor": "top", "text-offset": [0, 0.2], "text-letter-spacing": 0.05,
        },
        paint: { "text-color": INK, "text-opacity": 0.62, "text-halo-color": "rgba(14,15,12,0.85)", "text-halo-width": 1.1, "text-halo-blur": 1 },
      },
      {
        id: "places", type: "symbol", source: "osm", "source-layer": "place",
        filter: ["any", ["match", ["get", "class"], ["city", "town"], true, false], ["all", ["==", ["get", "class"], "village"], [">=", ["zoom"], 12.5]]],
        layout: {
          "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-transform": "uppercase", "text-letter-spacing": 0.22,
          "text-size": ["match", ["get", "class"], "city", 12, "town", 11, 9.5], "text-max-width": 9, "symbol-sort-key": ["match", ["get", "class"], "city", 0, "town", 1, 2],
        },
        paint: { "text-color": INK, "text-opacity": 0.78, "text-halo-color": "rgba(14,15,12,0.85)", "text-halo-width": 1.2, "text-halo-blur": 1 },
      },
    ],
  };
}

export const ROUTE = { flame: "#e8862a", glow: "#ffb35c", dim: "rgba(242,238,230,0.38)" };
