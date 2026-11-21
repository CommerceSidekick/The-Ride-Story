# The Ride Story

**[theridestory.com](https://theridestory.com) — every ride trip has a story. Tell it.** Everyone on a mountain bike trip drops in their photos, videos and ride
files. The Ride Story sorts them by day, pins each photo to the spot on the trail where it was taken, and produces:

- a **storybook** (cover, trip map, a chapter per day with route art, elevation profile, stats, photos and text,
  crew page with awards, "by the numbers") that exports as a print-ready PDF or publishes as a link, and
- a **post set** for Instagram (4:5 carousels, 9:16 stories) and Facebook (square album), sized, captioned and
  ready to download or share.

## What exists today, and where it falls short

| Product | What it does well | Gap for a riding crew |
|---|---|---|
| Polarsteps, Journi, Journo | Travel journal → printed book | Built for one traveller's phone GPS. No ride files, no elevation, no group stats. |
| Relive, PicTrek, How It Went | Turns a GPX/FIT track + photos into a video | Output is a short video, not a book or a post set. One rider at a time. |
| Strava | The ride log everyone already has | Photos live per-activity per-person. No trip, no book. Its API terms (Nov 2024) forbid showing one athlete's data to another user, so a group product cannot be built on the API. |
| Shutterfly, Blurb, Popsa, Mixbook | Photo book layout and printing | A blank canvas. No maps, no ride data, and somebody still has to collect 900 photos from the group chat. |
| Google/Apple shared albums | Collecting photos | A pile, not a story. |
| Beeline / route-print shops | A beautiful route poster | One map, no story. |

Nothing joins **group collection + ride data + book + social** in one place. That is the product.

### Decisions that follow from the research

- **Ride files, not the Strava API.** Riders export GPX/FIT from Strava (or Garmin, Wahoo, Coros) and drop them
  in. This works for every device, and it is the only approach consistent with Strava's API terms for a product
  where the whole crew sees each other's rides.
- **Photos are placed by time.** A photo's capture time is matched against the ride's GPS track, so captions
  read `11:42 · km 14.2 · 2,870 m` with no tagging. Photos with their own GPS use that instead.
- **The same ride recorded by four people counts once.** Overlapping recordings are merged for maps and trip
  totals; each rider keeps their own numbers for the crew page.
- **Maps are vector route art**, not tile screenshots: sharp in print, no map API key, no licensing problem in a
  printed book. (The interactive Map tab uses OpenFreeMap tiles.)
- **Drafts first, then your words.** Text starts from facts in the data in one of three voices; every line is
  click-to-edit. An optional AI writer weaves in the notes you type for each day.
- **Export, don't auto-post.** Posting to Instagram/Facebook by API requires Meta app review and business
  accounts. The Ride Story makes the images and captions; on a phone, Share hands them to the app.

## Run it

```bash
npm install
```

```bash
npm run dev
```

With no environment variables it runs in **local mode**: everything is stored in the browser (IndexedDB), which
is enough to build a book and posts on one device. Click **Open the Oaxaca sample** to see a finished book made
from generated data.

## Deploy: Supabase + Vercel

1. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_init.sql`.
2. Supabase → Authentication → URL Configuration: set the Site URL to your Vercel URL and add
   `https://<your-domain>/**` to Redirect URLs (sign-in is by email magic link).
3. Import this repo into Vercel (framework: Next.js, no extra settings) and set the variables from
   `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally
   `ANTHROPIC_API_KEY`. Set `NEXT_PUBLIC_SITE_URL=https://theridestory.com` for share previews.
4. Vercel → Project → Domains: add `theridestory.com` and `www.theridestory.com`, then point the domain's DNS
   at Vercel as the Domains page instructs.

With Supabase configured the app switches to **cloud mode**: sign-in, invite links (`/join/<code>`) so each rider
uploads from their own phone, and public book links (`/b/<slug>`) that work for anyone.

Notes on the cloud setup:

- Row-level security limits trips, rides and media to the trip's members. Published books are read through one
  function that returns a single trip by its slug.
- Media sits in a public-read storage bucket under unguessable paths, so published books need no sign-in.
  Anyone who has a file's URL can view that file.
- Supabase's default upload limit is 50 MB per file; long videos need a higher limit on the project.
- Trip settings, the book and the post set are saved as one document per trip; two people editing the book at
  the same moment will overwrite each other (uploads are not affected).

## Not built yet

- Ordering a printed copy inside the app (Lulu, Gelato, Prodigi and Peecho offer print APIs; today you upload
  the PDF to a printer yourself). Print bleed/crop marks are not added to the PDF.
- Direct publishing to Instagram/Facebook, and Strava sign-in for a rider's *own* activities.
- Video is stored, shown on the published page and used as a poster frame in layouts; there is no video editing.
- Native mobile apps. The web app works on phones.

## Layout

```
src/lib/        types, GPX/TCX/FIT parsing, geo maths, analysis, copy, book + post generators, storage
src/components/ book pages, social slides, route art, the Collect/Book/Social studios
src/app/        landing, /app, /app/trip/[id], /b/[slug], /join/[code], /api/narrate
supabase/       database schema and policies
```
