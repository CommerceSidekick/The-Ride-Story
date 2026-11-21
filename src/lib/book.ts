import { pickCover, pickPhotos, type Analysis } from "./analyze";
import { dayText, dayTitle, introText, outroText, tripCaption, dayCaption, tripDates } from "./copy";
import type { Book, BookConfig, BookPage, Post, Slide, SocialConfig, SocialSet, Trip } from "./types";
import { fmtDate, uid } from "./util";

export const DEFAULT_BOOK: BookConfig = { theme: "loam", size: "landscape", photosPerDay: 8, includeCrew: true, includeNumbers: true, tone: "stoked" };

export const SIZES = {
  landscape: { label: '10 × 8 in landscape', w: 10, h: 8 },
  square: { label: '8 × 8 in square', w: 8, h: 8 },
  a4: { label: "A4 landscape", w: 11.69, h: 8.27 },
} as const;

const page = (p: Omit<BookPage, "id">): BookPage => ({ id: uid(), ...p });

export function buildBook(trip: Trip, a: Analysis, config: BookConfig): Book {
  const pages: BookPage[] = [];
  const cover = pickCover(a);
  const used = new Set<string>(cover ? [cover.id] : []);
  pages.push(page({ type: "cover", photoIds: cover ? [cover.id] : [], title: trip.name, kicker: [trip.location, tripDates(a)].filter(Boolean).join(" · ") }));
  pages.push(page({ type: "overview", photoIds: [], title: "The trip", text: introText(trip, a, config.tone) }));
  if (config.includeCrew && trip.crew.length) pages.push(page({ type: "crew", photoIds: [], title: "The crew" }));

  const rhythm = [1, 3, 2, 4];
  for (const day of a.days) {
    const note = trip.dayNotes?.[day.date];
    pages.push(page({
      type: "day", date: day.date, photoIds: [],
      kicker: `Day ${day.index} · ${fmtDate(day.localMs)}`,
      title: dayTitle(day, trip),
      text: dayText(day, trip, config.tone),
    }));
    const shots = pickPhotos(day.media, config.photosPerDay, used);
    let i = 0, r = day.index; // offset the rhythm per day so chapters don't all look alike
    if (note?.trim() && shots.length) {
      pages.push(page({ type: "story", date: day.date, photoIds: [shots[0].id], title: "From the notes", text: note.trim() }));
      i = 1;
    }
    while (i < shots.length) {
      let n = Math.min(rhythm[r++ % rhythm.length], shots.length - i);
      if (shots.length - i - n === 1 && n < 4) n += 1; // don't strand a single photo
      pages.push(page({ type: "photos", date: day.date, photoIds: shots.slice(i, i + n).map((m) => m.id) }));
      i += n;
    }
    shots.forEach((m) => used.add(m.id));
  }
  if (config.includeNumbers && a.totals.outings) pages.push(page({ type: "numbers", photoIds: [], title: "By the numbers" }));
  const closer = a.days.flatMap((d) => d.media).filter((m) => !m.hidden && m.kind === "photo" && !used.has(m.id)).pop();
  pages.push(page({ type: "back", photoIds: closer ? [closer.id] : cover ? [cover.id] : [], text: outroText(trip, a, config.tone) }));
  return { config, pages, generatedAt: Date.now() };
}

/* ───────────────────────── Social ───────────────────────── */

export const DEFAULT_SOCIAL: SocialConfig = {
  igCarousel: true, igStory: true, fbPost: true, perDay: true,
  slidesPerCarousel: 7, tone: "stoked", theme: "loam", hashtags: "", handle: "",
};

export const FORMATS = {
  "ig-carousel": { label: "Instagram carousel", w: 1080, h: 1350, note: "4:5 · up to 20 slides" },
  "ig-story": { label: "Instagram story", w: 1080, h: 1920, note: "9:16 · post frames in order" },
  "fb-post": { label: "Facebook album post", w: 1200, h: 1200, note: "1:1 · multi-photo post" },
} as const;

const slide = (s: Omit<Slide, "id">): Slide => ({ id: uid(), ...s });

export function buildSocial(trip: Trip, a: Analysis, config: SocialConfig): SocialSet {
  const posts: Post[] = [];
  const cover = pickCover(a);
  const all = a.days.flatMap((d) => d.media);
  const sub = [trip.location, tripDates(a)].filter(Boolean).join(" · ");
  const hasRides = a.totals.outings > 0;
  const best = (n: number, skip: Set<string>) => {
    // Round-robin across days so the recap covers the whole trip.
    const perDay = a.days.map((d) => pickPhotos(d.media, n, skip));
    const out = [];
    for (let i = 0; out.length < n && i < n; i++) for (const d of perDay) if (d[i] && out.length < n) out.push(d[i]);
    return out.sort((x, y) => (x.localMs ?? 0) - (y.localMs ?? 0));
  };
  const skip = new Set(cover ? [cover.id] : []);

  if (config.igCarousel) {
    const fixed = 2 + (hasRides ? 2 : 0);
    const shots = best(Math.max(1, config.slidesPerCarousel - fixed), skip);
    posts.push({
      id: uid(), format: "ig-carousel", label: "Trip recap",
      caption: tripCaption(trip, a, config.tone, config.hashtags),
      slides: [
        slide({ template: "cover", photoId: cover?.id, title: trip.name, kicker: sub }),
        ...(hasRides ? [slide({ template: "map", title: "Where we rode" })] : []),
        ...shots.map((m) => slide({ template: "photo", photoId: m.id })),
        ...(hasRides ? [slide({ template: "stats", title: "By the numbers" })] : []),
        slide({ template: "outro", photoId: (shots[shots.length - 1] ?? cover)?.id, text: outroText(trip, a, config.tone) }),
      ],
    });
    if (config.perDay)
      for (const day of a.days) {
        const shots = pickPhotos(day.media, Math.max(2, config.slidesPerCarousel - 2));
        if (!shots.length) continue;
        posts.push({
          id: uid(), format: "ig-carousel", label: `Day ${day.index}`, date: day.date,
          caption: dayCaption(day, trip, config.tone, config.hashtags),
          slides: [
            slide({ template: "cover", photoId: shots[0].id, date: day.date, title: dayTitle(day, trip), kicker: `Day ${day.index} · ${fmtDate(day.localMs, { month: "short", day: "numeric" })}` }),
            ...(day.groups.length ? [slide({ template: "map", date: day.date, title: dayTitle(day, trip) })] : []),
            ...shots.slice(1).map((m) => slide({ template: "photo", photoId: m.id })),
          ],
        });
      }
  }
  if (config.igStory) {
    const shots = best(3, skip);
    posts.push({
      id: uid(), format: "ig-story", label: "Story set",
      caption: "Stories don't take captions — add stickers or a link to the full book.",
      slides: [
        slide({ template: "cover", photoId: cover?.id, title: trip.name, kicker: sub }),
        ...(hasRides ? [slide({ template: "map", title: "Where we rode" }), slide({ template: "stats", title: "By the numbers" })] : []),
        ...shots.map((m) => slide({ template: "photo", photoId: m.id })),
        slide({ template: "outro", photoId: (shots[0] ?? cover)?.id, text: outroText(trip, a, config.tone) }),
      ],
    });
  }
  if (config.fbPost && all.length) {
    const shots = best(5, new Set());
    posts.push({
      id: uid(), format: "fb-post", label: "Facebook album",
      caption: tripCaption(trip, a, config.tone, config.hashtags, true),
      slides: [
        slide({ template: "cover", photoId: cover?.id, title: trip.name, kicker: sub }),
        ...shots.map((m) => slide({ template: "photo", photoId: m.id })),
        ...(hasRides ? [slide({ template: "map", title: "Where we rode" })] : []),
      ],
    });
  }
  return { config, posts, generatedAt: Date.now() };
}
