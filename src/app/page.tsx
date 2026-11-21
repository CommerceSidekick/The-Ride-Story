import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

const Arr = () => <span className="arr" aria-hidden>→</span>;

const STORIES = [
  {
    id: "solo",
    n: "01",
    kicker: "Solo rides",
    title: ["Progress you", "can see."],
    photo: "/photos/battle.jpg",
    alt: "A lone rider silhouetted against a sunrise",
    strip: "Progress you earned, ride by ride.",
    body: "The climb you couldn't clear in spring. Your first hundred kilometres. The ride back after an injury. We line your rides up over time, pair them with the photos you took, and show how far you've come.",
    gets: ["Your rides on one map, over a season", "The climbs that changed, side by side", "A post that's more than a screenshot"],
  },
  {
    id: "group",
    n: "02",
    kicker: "Group rides",
    title: ["Same loop,", "new story."],
    photo: "/photos/crew.jpg",
    alt: "A group of mountain bikers regrouping on a trail above a valley",
    strip: "The weekly loop, everyone's photos together.",
    body: "The weekly ride with friends is the one you'll remember least, because it happens so often. Everyone's photos land in one place, the route is mapped once, and the group gets a recap worth opening.",
    gets: ["Everyone's photos, one ride", "Each rider's numbers, without the spreadsheet", "A carousel ready for the group chat"],
  },
  {
    id: "trip",
    n: "03",
    kicker: "Trips",
    title: ["A week", "worth keeping."],
    photo: "/photos/trip.jpg",
    alt: "A mountain biker descending a gravel road through alpine meadows",
    strip: "A week of riding, told day by day.",
    body: "Oaxaca, Moab, the Alps. Each day becomes a chapter: the route on a 3D map, the climbs, where every photo was taken, and what happened — in your words. Read it online, or print it as a book.",
    gets: ["An online story, photos over a 3D map of the ride", "A printed book with maps and elevation", "A post for every day of the trip"],
  },
];

const STEPS = [
  ["01", "Connect", "Connect Strava, or drop in the ride files from your Garmin, Wahoo or Coros. Every rider brings their own."],
  ["02", "Upload", "Photos and clips from every phone in the crew. We pin each shot to the exact spot on the trail where it was taken."],
  ["03", "Tell it", "We draft the story — maps, numbers, the moments that stood out. You add what happened. Then read it online, print it, or post it."],
];

const DETAILS = [
  ["Photos that know where they were", "Every shot is matched to the ride by its time, so a caption reads 11:42 · km 14.2 · 2,870 m without anyone tagging anything."],
  ["One ride, counted once", "When four of you record the same descent, the totals stay honest — and each rider still gets their own numbers."],
  ["Maps made for print", "Routes are drawn as clean vector art with your photo stops marked and the elevation underneath. Sharp at any size."],
  ["Your voice, not a template", "Start from a draft that sounds like you — stoked, dry or poetic — then change any word. Add the stuff only you know."],
  ["Built for every feed", "4:5 carousels, 9:16 stories and square albums, sized for Instagram and Facebook, with captions written."],
  ["Print it or publish it", "A print-ready PDF at real book sizes, or a private link to the full story — the back cover carries a QR code to it."],
];

export default function Home() {
  return (
    <div className="site flex-1">
      <SiteHeader />

      {/* ─────────── Hero ─────────── */}
      <section className="grain relative flex min-h-[100svh] items-end overflow-hidden">
        <Image src="/photos/hero.jpg" alt="A mountain biker silhouetted on a ridge under a dramatic sky" fill priority sizes="100vw" className="object-cover object-[60%_center]" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(14,15,12,0.92) 0%, rgba(14,15,12,0.6) 45%, rgba(14,15,12,0.15) 100%), linear-gradient(0deg, rgba(14,15,12,1) 0%, rgba(14,15,12,0.35) 45%, rgba(14,15,12,0) 70%)" }} />
        <div className="wrap relative pb-16 pt-40 md:pb-24">
          <div className="x-eyebrow">Ride stories, books and posts</div>
          <h1 className="x-display mt-6 max-w-[11ch]">
            Every ride <br />has a <span className="x-flame">story.</span>
          </h1>
          <p className="x-lead mt-8 max-w-[40ch] text-[#f2eee6]/85">
            A hard-won climb, a Saturday loop with friends, a week in the mountains. Connect Strava, add your photos, and we&apos;ll help you capture the ride and tell its story.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/app" className="s-btn">Start your story <Arr /></Link>
            <a href="#what-you-get" className="s-btn s-btn-ghost">See what you get</a>
          </div>
        </div>
      </section>

      {/* ─────────── Pillars strip ─────────── */}
      <section className="border-b border-[#2e312b]">
        <div className="wrap grid md:grid-cols-3">
          {STORIES.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className={`group block py-8 md:px-8 ${i ? "border-t border-[#2e312b] md:border-l md:border-t-0" : "md:pl-0"}`}>
              <div className="x-mono text-[0.8rem] text-[#e8862a]">{s.n}</div>
              <div className="x-h3 mt-2 transition group-hover:text-[#e8862a]">{s.kicker}</div>
              <div className="x-muted mt-1 text-[0.95rem]">{s.strip}</div>
            </a>
          ))}
        </div>
      </section>

      {/* ─────────── Manifesto ─────────── */}
      <section className="sec">
        <div className="wrap grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <Reveal>
            <div className="x-eyebrow">Why we built it</div>
            <h2 className="x-h2 mt-5">
              Your data says <span className="x-outline">what</span> happened.<br />
              Your story says <span className="x-flame">why it mattered.</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="x-lead x-muted max-w-[46ch]">
              After a ride, the pieces scatter: a file on Strava, photos across five phones, a group chat asking for &ldquo;that one of me on the descent.&rdquo; The Ride Story puts them back together, in order and in place, so the ride becomes something you keep.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── Three stories ─────────── */}
      <section id="stories" className="pb-8">
        {STORIES.map((s, i) => (
          <article key={s.id} id={s.id} className="sec !pt-0 scroll-mt-24">
            <div className={`wrap grid items-center gap-10 lg:gap-16 ${i % 2 ? "lg:grid-cols-[1fr_1.15fr]" : "lg:grid-cols-[1.15fr_1fr]"}`}>
              <Reveal className={`relative aspect-[4/3] overflow-hidden rounded-[4px] ${i % 2 ? "lg:order-2" : ""}`}>
                <Image src={s.photo} alt={s.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(14,15,12,0.55), transparent 50%)" }} />
                <div className="x-display absolute bottom-3 left-5 !text-[clamp(4rem,9vw,8rem)] text-[#f2eee6]/90">{s.n}</div>
              </Reveal>
              <Reveal delay={100}>
                <div className="x-eyebrow">{s.kicker}</div>
                <h3 className="x-h2 mt-5 !text-[clamp(1.9rem,4vw,3.4rem)]">
                  {s.title[0]}
                  <br />
                  <span className="x-flame">{s.title[1]}</span>
                </h3>
                <p className="x-lead x-muted mt-6 max-w-[48ch]">{s.body}</p>
                <ul className="mt-7 space-y-3">
                  {s.gets.map((g) => (
                    <li key={g} className="flex gap-3 text-[1rem]">
                      <span className="mt-[0.7em] h-[2px] w-4 flex-none bg-[#e8862a]" />
                      {g}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </article>
        ))}
      </section>

      {/* ─────────── How it works ─────────── */}
      <section id="how" className="sec on-bone scroll-mt-16">
        <div className="wrap">
          <Reveal>
            <div className="x-eyebrow">How it works</div>
            <h2 className="x-h2 mt-5 max-w-[16ch]">You ride. <span className="x-outline">We do the sorting.</span></h2>
          </Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[4px] bg-[#d8d1c2] md:grid-cols-3">
            {STEPS.map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 110} className="bg-[#f2eee6] p-8 md:p-10">
                <div className="x-display !text-[clamp(4rem,7vw,6.5rem)] text-[#e8862a]">{n}</div>
                <div className="x-h3 mt-6">{t}</div>
                <p className="x-muted mt-3 text-[1rem]">{d}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="x-mono text-[0.8rem] uppercase tracking-[0.14em] text-[#4d4a41]">Works with rides from</span>
            {["Strava", "Garmin", "Wahoo", "Coros", "Apple Watch", "GPX · FIT · TCX"].map((b) => (
              <span key={b} className="x-h3 !text-[1.05rem] text-[#0e0f0c]/70">{b}</span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ─────────── Statement band ─────────── */}
      <section className="grain relative overflow-hidden">
        <Image src="/photos/statement.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[#0e0f0c]/60" />
        <div className="wrap sec relative text-center">
          <Reveal>
            <p className="x-h2 mx-auto max-w-[18ch]">
              The ride ends.<br /><span className="x-flame">The story doesn&apos;t have to.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────── What you get ─────────── */}
      <section id="what-you-get" className="sec scroll-mt-16">
        <div className="wrap">
          <Reveal className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <div className="x-eyebrow">What you get</div>
              <h2 className="x-h2 mt-5">A story to read.<br /><span className="x-flame">A book to keep.</span></h2>
            </div>
            <p className="x-lead x-muted max-w-[46ch]">One set of rides and photos, told three ways. Everything is built from what you recorded and shot — and every word is yours to change.</p>
          </Reveal>

          <div className="mt-16 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <Reveal className="on-ridge relative overflow-hidden rounded-[4px] p-6 md:p-10">
              <div className="x-mono text-[0.8rem] text-[#e8862a]">01 · The storybook</div>
              <div className="x-h3 mt-2">A printed book.</div>
              <p className="x-muted mt-2 max-w-[44ch] text-[0.98rem]">Cover, the route of every day, elevation, your best shots and your words. Print-ready files for Lulu, Blurb, Prodigi and other photo-book printers.</p>
              <div className="relative mt-8 h-[300px] sm:h-[380px]">
                <Image src="/marketing/book-day.jpg" alt="A storybook page showing a day's route map, stats and elevation" width={1400} height={1120} className="tilt-r absolute right-0 top-6 w-[72%] rounded-[3px] shadow-2xl shadow-black/60" />
                <Image src="/marketing/book-cover.jpg" alt="A storybook cover with a mountain bike photo and the trip title" width={1400} height={1120} className="tilt absolute left-0 top-0 w-[64%] rounded-[3px] shadow-2xl shadow-black/70" />
              </div>
            </Reveal>
            <div className="grid gap-6">
              <Reveal delay={100} className="on-ridge overflow-hidden rounded-[4px] p-6 md:p-8">
                <div className="x-mono text-[0.8rem] text-[#e8862a]">02 · The post set</div>
                <div className="x-h3 mt-2">Posts, sized and captioned.</div>
                <div className="mt-6 flex gap-3">
                  {["ig-cover", "ig-map", "ig-stats"].map((f) => (
                    <Image key={f} src={`/marketing/${f}.jpg`} alt="" width={540} height={675} className="w-1/3 rounded-[3px]" />
                  ))}
                </div>
              </Reveal>
              <Reveal delay={180} className="on-ridge overflow-hidden rounded-[4px] p-6 md:p-8">
                <div className="x-mono text-[0.8rem] text-[#e8862a]">03 · The online story</div>
                <div className="x-h3 mt-2">Photos over a 3D map of the ride.</div>
                <p className="x-muted mt-2 text-[0.98rem]">Scroll through each day as the map follows the route. One private link for everyone who wasn&apos;t there.</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Crews ─────────── */}
      <section id="crew" className="sec on-ridge scroll-mt-16">
        <div className="wrap grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <Reveal className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[4px]">
              <Image src="/photos/singletrack.jpg" alt="Riders following each other down forest singletrack" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-2 rounded-[4px] bg-[#e8862a] px-6 py-5 text-[#0e0f0c] md:-right-8">
              <div className="x-mono text-[0.72rem] uppercase tracking-[0.14em]">Day 2 · La Cumbre</div>
              <div className="x-h3 mt-1">16.6 km · 1,328 m down</div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="x-eyebrow">Riding with others</div>
            <h2 className="x-h2 mt-5">Everyone&apos;s photos.<br /><span className="x-flame">One story.</span></h2>
            <p className="x-lead x-muted mt-6 max-w-[46ch]">Send one link. Each rider adds their own rides and photos from their own phone. We merge the duplicate recordings, sort everything by day, and credit every photo to whoever took it.</p>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[4px] bg-[#2e312b]">
              {DETAILS.map(([t, d]) => (
                <div key={t} className="bg-[#1c1e1a] p-5">
                  <div className="font-[family-name:var(--font-archivo)] text-[0.98rem] font-extrabold leading-tight">{t}</div>
                  <p className="x-muted mt-2 text-[0.88rem] leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────── CTA ─────────── */}
      <section className="grain relative overflow-hidden">
        <Image src="/photos/mountain.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(14,15,12,0.92), rgba(14,15,12,0.55))" }} />
        <div className="wrap sec relative">
          <Reveal>
            <div className="x-eyebrow">Your turn</div>
            <h2 className="x-display mt-6 max-w-[12ch] !text-[clamp(2.8rem,8vw,7.5rem)]">Your next ride is already a <span className="x-flame">story.</span></h2>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/app" className="s-btn">Start your story <Arr /></Link>
              <Link href="/app" className="s-btn s-btn-ghost">Open the Oaxaca sample</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
