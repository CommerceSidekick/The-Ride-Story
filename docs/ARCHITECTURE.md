# The Ride Story: how it works

Live site: **https://the-ride-story.vercel.app**. theridestory.com will point here once its DNS is set in Vercel.

| What | URL |
|---|---|
| Marketing homepage | `/` |
| Example stories | `/examples/oaxaca`, `/examples/ventoux` |
| The app (trips, uploads, book, posts) | `/app` |
| One trip's workspace | `/app/trip/<id>` (tabs: Collect, Map, Book, Social) |
| Story preview from inside the app | `/app/trip/<id>/story` |
| A published story | `/b/<slug>` |
| Crew invite link (needs Supabase) | `/join/<code>` |
| Palette preview | any page with `?palette=ember`, `ember-deep`, `amber`, `summit`, `glacier`, `signal` or `clay` |

Source: https://github.com/CommerceSidekick/The-Ride-Story. Merging to `main` deploys to production. Every other branch gets a Vercel preview.

## The short version

It is one Next.js app hosted on Vercel. Almost all of the work happens **in the rider's browser**:
- reading ride files and photos
- matching photos to the route
- laying out the book
- drawing the 3D map
- rendering post images and print PDFs

The server side is small: a few API routes for Strava sign-in and the optional AI text rewrite. Storage is either the browser itself (now) or Supabase (once its keys are set).

There are **no autonomous AI agents** in the product. Everything is deterministic code, plus one optional AI call (see "AI in the product" below).

```
 Rider's browser                                     Vercel (Next.js server)             Third parties
 ──────────────────────────────────────────          ───────────────────────────         ─────────────────────────
 Upload GPX / FIT / TCX + photos + videos
   └─ parse.ts, images.ts (EXIF, HEIC, resize)
 analyze.ts: days, photo→route matching,
   duplicate-ride merging, stats, awards
 book.ts / copy.ts: book pages, post sets, text
 TerrainMap (MapLibre): 3D map  ─────────────────────────────────────────────────────►  Map tiles: EOX imagery,
 StoryView: scroll story over the map                                                    AWS terrain, OpenFreeMap
 PrintPanel: 300 dpi PDFs (pdf-lib)
 SocialTab: PNG slides (html-to-image)
 store.ts ──► IndexedDB (local mode)
          └─► Supabase DB + Storage (cloud mode) ─────────────────────────────────────►  Supabase
 StravaPanel ──────────────────────────────►  /api/strava/* (OAuth, list rides) ──────►  Strava API
 "Rewrite with AI" ────────────────────────►  /api/narrate ───────────────────────────►  Anthropic (Claude)
```

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4**, hosted on Vercel.
- **MapLibre GL 6** for the 3D map, with **maplibre-contour** for contour lines generated in the browser. The map worker is copied to `public/maplibre/` at build time (`scripts/copy-maplibre-worker.mjs`).
- **Supabase** (Postgres, Auth, Storage) for cloud mode. The schema is `supabase/migrations/0001_init.sql`.
- File parsing: **fit-file-parser** (FIT), built-in XML parsing (GPX/TCX), **exifr** (photo time and GPS), **heic2any** (iPhone photos).
- Output: **pdf-lib** (print PDFs), **html-to-image** (slides and pages to PNG/JPEG), **jszip** (downloads), **qrcode** (back-cover link).
- Fonts match Epoch Performance Health: Archivo (headlines), Barlow (body), JetBrains Mono (labels). Fraunces is used inside the books.

## How a trip flows through the code

1. **Collect** (`components/CollectTab.tsx`, `lib/ingest.ts`)
   - Ride files go to `lib/parse.ts`, which produces a track of points (lat, lon, elevation, time).
   - Stats come from `lib/geo.ts`: distance, climbing with noise smoothing, moving time, top speed.
   - Photos and videos go to `lib/images.ts`, which reads the capture time and GPS, converts HEIC, and makes a 3,600 px display copy plus a thumbnail.
   - The trip's timezone is guessed from the first ride's longitude.
2. **Analyse** (`lib/analyze.ts`)
   - Groups everything into days.
   - Merges rides that overlap in time from different riders into one outing.
   - Places each photo on the route by its time, or by its own GPS if it has one.
   - Works out per-rider stats and the crew "awards".
3. **Book** (`lib/book.ts`, `lib/copy.ts`, `components/BookTab.tsx`, `BookPageView.tsx`)
   - Builds the pages: cover, overview map, crew, a chapter per day with route art and elevation, photo layouts, story pages, numbers, back cover.
   - The draft text comes from facts only, in three voices.
   - Every word is editable, and every photo can be swapped.
4. **Map and story** (`components/TerrainMap.tsx`, `StoryView.tsx`, `lib/terrain-style.ts`)
   - The 3D map: satellite imagery, terrain, hillshade, contours, trails and peak names.
   - The story is a scroll page. As each section comes into view, the camera flies to that day or photo and the route fills in up to that point.
5. **Print** (`components/PrintPanel.tsx`, `lib/print.ts`, `Map3dCapture.tsx`)
   - Pages are rasterised at 300 dpi into an interior PDF with 0.125″ bleed, plus a wraparound cover PDF with a spine.
   - There is a page-image zip for editors such as Vistaprint's.
   - Presets cover Lulu, Blurb, Prodigi and other printers.
   - Optionally, a 3D map page can be added for each day.
6. **Social** (`components/SocialTab.tsx`, `SlideView.tsx`)
   - Instagram carousels (4:5), story frames (9:16) and Facebook album images (1:1), each with a caption.
   - Exported as PNG/zip, or shared straight from a phone.
7. **Publish** (`app/b/[slug]`, `components/published/PublishedTrip.tsx`)
   - A private link that opens the story, with the book one click away.
   - The built-in examples use the same view, loading a static bundle from `public/examples/<slug>/bundle.json`.

## Storage: two modes

`lib/store.ts` exposes one interface with two implementations:

- **Local mode** (current, while no Supabase keys are set):
  - Trips, rides and media live in the browser's IndexedDB.
  - It works with no accounts, but a trip exists only in the browser that made it.
  - Invites don't work, and published links only open in that same browser.
- **Cloud mode** (set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`):
  - Sign-in is by emailed magic link.
  - Trips, rides and media live in Postgres. Photos and videos live in a Storage bucket.
  - Row-level security limits each trip to its owner and members.
  - Invite links add members through the `join_trip()` function.
  - Published stories are read through `get_published()` without signing in.

## Server routes

| Route | Purpose |
|---|---|
| `/api/strava/connect`, `/callback`, `/status`, `/activities`, `/disconnect` | Strava sign-in (OAuth), with the token kept in an encrypted, browser-inaccessible (httpOnly) cookie. Lists the rider's own rides, shown only to them and never stored. Disconnecting revokes access on Strava. |
| `/api/narrate` | Optional AI rewrite of book text. Accepts only requests from this site, up to 120 KB. |
| `/robots.txt`, `/sitemap.xml` | Search engines. The app and private pages are excluded. |

## AI in the product

The product contains **no AI agents**: nothing plans, browses or acts on its own. There is one optional AI feature:

- **"Rewrite text with AI"** (Book tab). It sends the trip's facts (ride names, distances, climbing, the riders' own notes) to Claude through `/api/narrate`, using the Anthropic SDK and model `claude-opus-5-5`.
  - Claude returns a title and text for each page, which the rider can edit.
  - It only appears when `ANTHROPIC_API_KEY` is set in Vercel.
  - Strava's API terms forbid sending Strava API data to AI. The rides used here come from files the riders exported themselves, never from the Strava API.

Everything else that looks "smart" is ordinary code in `lib/analyze.ts` and `lib/copy.ts`: photo placement, merging duplicate rides, picking the best photos, the cover, the awards and the draft text.

If agents are wanted later, good candidates are:
- a caption writer for social posts
- an "importer" that fixes wrong camera clocks automatically
- a print-order agent that talks to a printer's API

## Configuration (Vercel → Settings → Environment Variables)

| Variable | Turns on |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for share previews and the sitemap (e.g. `https://theridestory.com`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cloud mode: accounts, crew invites, shareable links |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` (+ optional `STRAVA_TOKEN_SECRET`) | Connect with Strava |
| `ANTHROPIC_API_KEY` | AI rewrite in the Book tab |

The live palette is set by `DEFAULT_PALETTE` in `src/lib/palettes.ts`.

## Third-party services and licences

- **Map imagery:** EOxCloudless 2016 (Sentinel-2), CC BY 4.0.
- **Elevation:** AWS Terrain Tiles.
- **Labels, trails, peaks:** OpenStreetMap via OpenFreeMap.

All three are free and need no key. They are credited on the map and in printed pages. At high traffic, consider paid tile hosting (e.g. MapTiler) for reliability.

- **Strava:** used under its 2026 API Agreement. Data is shown only to the rider who connected and is not stored. New Strava apps are limited to 1 athlete, which can be raised to 10; beyond that, Strava has to review the app.
- **Photos on the marketing site:** Unsplash licence. See `public/photos/CREDITS.md`.

## Known gaps

- **Payments:** there is no checkout for the $25 book.
- **Printer ordering:** files are exported, but orders aren't sent to a printer's API.
- **Free-tier limits:** the limit isn't defined or enforced yet.
- **Legal pages:** privacy policy and terms are still needed, and Strava's review asks for them.
- **Moto photos:** the Moto section uses a 3D render until real moto photos are added.
- **Large 3D map pages:** these are heavy on low-end devices.
