import Link from "next/link";
import { Logo } from "@/components/Logo";

const STEPS = [
  ["01", "Everyone drops their stuff in", "Photos, videos, and ride files from Strava, Garmin, Wahoo or Coros. One trip, one link, the whole crew."],
  ["02", "We find the story", "It sorts by day, pins every photo to the exact spot on the trail it was taken, merges duplicate recordings of the same ride, and works out the numbers."],
  ["03", "You get a book and a post set", "A print-ready storybook with maps, elevation and your words. Plus sized-and-captioned posts for Instagram and Facebook."],
];

const FEATURES = [
  ["Photos know where they were taken", "Each shot is matched to the ride by time, so captions read “11:42 · km 14.2 · 2,870 m” without anyone tagging anything."],
  ["Four riders, one ride, counted once", "When the whole crew records the same descent, the trip totals stay honest and each rider still gets their own stats — and awards."],
  ["Route art, not screenshots", "Maps are drawn as vector art that stays sharp in print, with photo stops marked and an elevation profile underneath."],
  ["Every word is editable", "Start from a draft in your tone — stoked, dry, or poetic — then click any line and make it yours. Add what really happened each day."],
  ["Posts for each platform", "4:5 carousels, 9:16 stories, square Facebook albums. Trip recap or one per day. Download as PNGs or share straight from your phone."],
  ["Print it or publish it", "Export a PDF at real book sizes for any printer, or publish a link. The back cover carries a QR code to the online version with your clips."],
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-loam text-bone">
        <svg className="absolute inset-0 h-full w-full opacity-[0.13]" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M-50 ${520 - i * 46} C 200 ${420 - i * 50}, 380 ${640 - i * 44}, 620 ${470 - i * 48} S 1000 ${380 - i * 40}, 1250 ${500 - i * 52}`} fill="none" stroke="#f3eee4" strokeWidth="1.4" />
          ))}
        </svg>
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6">
          <header className="flex items-center justify-between">
            <Logo />
            <Link href="/app" className="btn btn-ghost btn-sm">Open app</Link>
          </header>
          <div className="mt-20 max-w-3xl">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-marigold">For crews who ride far from home</div>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              The trip was epic.
              <br />
              <span className="text-marigold">Now tell the story.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-bone/75">
              The Ride Story gathers everyone&apos;s photos, clips and ride files from a mountain bike trip and turns them into a storybook you can print — and a set of posts you can share tonight.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="btn btn-primary !px-6 !py-3 !text-base">Start a trip</Link>
              <Link href="/app" className="btn btn-ghost !px-6 !py-3 !text-base">See the Oaxaca sample</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {STEPS.map(([n, t, d]) => (
            <div key={n}>
              <div className="font-display text-5xl font-semibold text-marigold">{n}</div>
              <h3 className="mt-3 font-display text-2xl font-semibold">{t}</h3>
              <p className="mt-2 leading-relaxed text-loam/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-bone-2/60">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight">Built for the group chat that has 900 unsorted photos in it.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="card p-6">
                <h3 className="font-display text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-loam/70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight">Every ride trip has a story. Tell yours.</h2>
        <Link href="/app" className="btn btn-dark mt-6 !px-6 !py-3 !text-base">Start a trip</Link>
        <p className="mt-10 text-xs text-dust">The Ride Story reads ride files you export yourself. It is not affiliated with Strava, Garmin, Wahoo, Coros, Instagram or Facebook.</p>
      </section>
    </main>
  );
}
