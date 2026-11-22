/**
 * Brand palettes for the public site and stories. Change DEFAULT_PALETTE to pick the live one;
 * visitors can preview the others with ?palette=<id> (adds a switcher at the bottom of the page).
 */
export const PALETTES = [
  { id: "ember", name: "Ember", note: "Black and hot orange. Closest to Strava.", swatch: ["#0e0f0c", "#ff5a1f", "#f2eee6"] },
  { id: "ember-deep", name: "Ember Deep", note: "Black and a deeper, redder ember orange. Still orange, further from Strava.", swatch: ["#0e0f0c", "#e4572e", "#f2eee6"] },
  { id: "amber", name: "Amber", note: "Black and warm amber orange. Sunset rather than Strava.", swatch: ["#0e0f0c", "#ff8a1f", "#f2eee6"] },
  { id: "summit", name: "Summit", note: "Black and gold. Warm, premium, clearly not Strava orange.", swatch: ["#0f0e0b", "#f2b33d", "#f2eee6"] },
  { id: "glacier", name: "Glacier", note: "Blue-black and ice. Cold, technical, alpine.", swatch: ["#0a1016", "#7cc8ff", "#eef3f6"] },
  { id: "signal", name: "Signal", note: "Black and acid lime. Ties to Epoch, impossible to confuse with Strava.", swatch: ["#0e0f0c", "#d4ff3a", "#f2eee6"] },
  { id: "clay", name: "Clay", note: "Paper and terracotta. Feels like the printed book.", swatch: ["#efe9dd", "#b5462f", "#1b1a17"] },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
export const DEFAULT_PALETTE: PaletteId = "ember";

/** Runs before first paint so a previewed palette doesn't flash. */
export const paletteBootScript = `(function(){try{var q=new URLSearchParams(location.search).get('palette');var ids=${JSON.stringify(PALETTES.map((p) => p.id))};if(q&&ids.indexOf(q)>-1){localStorage.setItem('trs-palette',q);}var p=localStorage.getItem('trs-palette');if(q==='reset'){localStorage.removeItem('trs-palette');p=null;}document.documentElement.dataset.palette=(p&&ids.indexOf(p)>-1)?p:'${DEFAULT_PALETTE}';}catch(e){}})();`;
