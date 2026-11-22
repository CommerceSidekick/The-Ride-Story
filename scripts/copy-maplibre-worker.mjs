// MapLibre 6 loads its web worker from a file next to its own module; bundlers move that module,
// so we serve the worker from /maplibre/ and point MapLibre at it (see TerrainMap.tsx).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
console.log(`copied maplibre-gl ${pkg.version} worker`);
