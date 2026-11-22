import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PalettePicker } from "@/components/site/PalettePicker";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SPONSOR } from "@/lib/sponsor";

const Arr = () => <span className="arr" aria-hidden>→</span>;

const RIDES = [
  {
    id: "mtb", n: "01", label: "MTB", photo: "/photos/enduro.jpg", alt: "A mountain biker riding down a rocky forest trail",
    title: "Every root, rock and hike-a-bike.",
    body: "Laps after work, enduro days, the trip you'll still be talking about in ten years. Every photo lands on the exact spot on the trail, on a 3D map you'll actually want to show people.",
  },
  {
    id: "cycling", n: "02", label: "Cycling", photo: "/photos/road-dawn.jpg", alt: "Road cyclists riding together at sunrise",
    title: "Climbs, cafés and the long way home.",
    body: "Gran fondos, the Saturday group ride, your first century. The climbs, the splits and the faces at the top, told properly instead of buried in a feed.",
  },
  {
    id: "moto", n: "03", label: "Moto", photo: "/photos/moto-route.jpg", alt: "A motorcycle route drawn over a 3D map of mountain roads",
    title: "Big miles. Bigger views.",
    body: "Adventure loops, dual-sport weekends, the run across three states. Drop in the GPX from your GPS and the clips from your helmet cam. We'll handle the rest.",
  },
];

const EXAMPLES = [
  { slug: "oaxaca", tag: "MTB · 3 days · 4 riders", title: "Sierra Norte, Oaxaca", meta: "Ridge laps, a 1,300 m descent and the cloud-forest trails.", image: "/marketing/example-oaxaca.jpg", alt: "A mountain-bike photo floating over a 3D map of the Sierra Norte" },
  { slug: "ventoux", tag: "Road · 1 day · 3 riders", title: "Mont Ventoux", meta: "Bédoin to the summit and back via Malaucène, 55 km.", image: "/marketing/example-ventoux.jpg", alt: "A cyclist in morning fog floating over a 3D map of Mont Ventoux" },
];

const DIFFERENT: [string, string][] = [
  ["One rider, one activity at a time", "The whole group in one story: duplicate recordings merged, everyone's photos on one timeline"],
  ["A feed post or a short video", "An online story, ready-to-post sets and a printed book from the same upload"],
  ["3D views behind a subscription", "The 3D story is free. You only pay if you want paper"],
  ["Locked to one app or one device", "Any GPS: Strava, Garmin, Wahoo, Coros, a phone or a moto GPS"],
  ["Built for single workouts", "Built for multi-day trips, with a chapter for every day"],
];

const STEPS = [
  ["01", "Bring the ride", "Connect Strava, or drop in GPX and FIT files from Garmin, Wahoo, Coros or any GPS."],
  ["02", "Add the photos", "Phones, cameras, helmet cams. Invite the crew and everyone adds their own. Each shot is matched to where and when it happened."],
  ["03", "Tell it", "You get an online story over a 3D map, posts sized for Instagram and Facebook, and a book you can print. Change any word you like."],
];

const FAQ = [
  ["Do I need Strava?", "No. Strava makes it quicker, but any GPX, FIT or TCX file works, from any bike computer, watch or moto GPS."],
  ["Who owns my photos?", "You do. We use them to build your story and nothing else."],
  ["Can my whole crew add photos?", "Yes. Send one invite link and everyone adds their own rides and photos from their own phone."],
  ["What does the book cost?", "$25 a copy plus shipping. Digital stories are free."],
];

export default function Home() {
  return (
    <div className="site topo flex-1">
      <div className="topo-layer" aria-hidden />
      <SiteHeader />

      <main>
      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-center">
        <div className="wrap relative pb-16 pt-32">
          <h1 className="x-display max-w-[12ch] !text-[clamp(3.2rem,10vw,9.5rem)]">The ride was epic.</h1>
          <p className="x-h2 mt-6 !text-[clamp(1.7rem,3.6vw,3.1rem)] text-[var(--flame)]">We&apos;ll help tell the story.</p>
          <p className="x-lead mt-8 max-w-[44ch] text-[var(--bone-s)]/85">
            Strava kept the numbers. Your phone kept 600 photos. Your buddies kept the good ones. Throw it all in and we&apos;ll turn it into something worth reading, posting and putting on a shelf.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/app" className="s-btn">Start free <Arr /></Link>
            <Link href="/examples/oaxaca" className="s-btn s-btn-ghost">See a real story</Link>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="sec !pt-4 scroll-mt-16">
        <div className="wrap">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="x-eyebrow">Examples</div>
              <h2 className="x-h2 mt-4">Don&apos;t take our word for it. Scroll one.</h2>
            </div>
            <p className="x-muted max-w-[40ch]">Real routes, real terrain. Open one and scroll: the map follows the ride and the photos land where they were taken.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {EXAMPLES.map((e, i) => (
              <Reveal key={e.slug} delay={i * 90}>
                <Link href={`/examples/${e.slug}`} className="panel group block overflow-hidden">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image src={e.image} alt={e.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                    <span className="x-mono absolute left-4 top-4 rounded-[3px] bg-[var(--carbon)]/80 px-2 py-1 text-[0.66rem] uppercase tracking-[0.16em] text-[var(--bone-s)]">{e.tag}</span>
                  </div>
                  <div className="flex items-end justify-between gap-4 p-6">
                    <div>
                      <h3 className="x-h3">{e.title}</h3>
                      <p className="x-muted mt-1 text-[0.95rem]">{e.meta}</p>
                    </div>
                    <span className="s-btn s-btn-sm shrink-0">Open <Arr /></span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why it's different */}
      <section className="sec">
        <div className="wrap">
          <Reveal className="max-w-3xl">
            <div className="x-eyebrow">Why it&apos;s different</div>
            <h2 className="x-h2 mt-4">Not another activity feed.</h2>
            <p className="x-lead x-muted mt-4">Everyone rode it. Now it&apos;s one story: every rider&apos;s photos, on the route, on the map, in print.</p>
          </Reveal>
          <div className="panel mt-10 overflow-hidden">
            {DIFFERENT.map(([them, us], i) => (
              <div key={us} className={`grid gap-2 px-6 py-5 md:grid-cols-[1fr_1.3fr] md:gap-10 ${i ? "border-t border-[var(--bone-s)]/10" : ""}`}>
                <p className="text-[var(--dust-s)] line-through decoration-[var(--dust-s)]/50">{them}</p>
                <p className="font-medium"><span className="mr-2 text-[var(--flame)]">→</span>{us}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MTB · Cycling · Moto */}
      <section className="sec !pt-8">
        <div className="wrap">
          <div className="grid gap-5 lg:grid-cols-3">
            {RIDES.map((r, i) => (
              <Reveal key={r.id} delay={i * 90} className="panel scroll-mt-24 overflow-hidden" >
                <article id={r.id}>
                  <div className="relative aspect-[4/3]">
                    <Image src={r.photo} alt={r.alt} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, color-mix(in srgb, var(--carbon) 85%, transparent), color-mix(in srgb, var(--carbon) 0%, transparent) 55%)" }} />
                    <div className="absolute bottom-4 left-5 font-[family-name:var(--font-archivo)] text-[2.6rem] font-black uppercase leading-none [font-stretch:125%]">{r.label}</div>
                  </div>
                  <div className="p-6">
                    <div className="x-eyebrow">{r.n} · {r.label}</div>
                    <h2 className="x-h3 mt-3">{r.title}</h2>
                    <p className="x-muted mt-3 text-[0.98rem] leading-relaxed">{r.body}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="sec scroll-mt-16">
        <div className="wrap">
          <Reveal className="max-w-2xl">
            <div className="x-eyebrow">How it works</div>
            <h2 className="x-h2 mt-4">Three steps. No design degree.</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 90} className="panel p-7">
                <div className="font-[family-name:var(--font-archivo)] text-[3.2rem] font-black leading-none text-[var(--flame)] [font-stretch:125%]">{n}</div>
                <h3 className="x-h3 mt-5">{t}</h3>
                <p className="x-muted mt-2 text-[0.98rem] leading-relaxed">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section id="what-you-get" className="sec scroll-mt-16">
        <div className="wrap">
          <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <div className="x-eyebrow">What you get</div>
              <h2 className="x-h2 mt-4">One ride. Three ways to tell it.</h2>
            </div>
            <p className="x-lead x-muted max-w-[46ch]">Built from what you recorded and what you shot. Nothing made up, nothing stock.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <Reveal className="panel overflow-hidden p-6 md:p-8">
              <div className="x-eyebrow">The online story</div>
              <h3 className="x-h3 mt-2">Your photos over a 3D map of the ride.</h3>
              <p className="x-muted mt-2 max-w-[48ch] text-[0.98rem]">Scroll and the map follows the route, stopping wherever someone took a photo. One link for everyone who wasn&apos;t there.</p>
              <Image src="/marketing/story-photo.jpg" alt="A ride photo floating over a 3D satellite map of the route" width={1200} height={695} className="mt-6 w-full rounded-[4px]" />
            </Reveal>
            <div className="grid gap-5">
              <Reveal delay={90} className="panel overflow-hidden p-6 md:p-8">
                <div className="x-eyebrow">The book</div>
                <h3 className="x-h3 mt-2">Printed, with maps and elevation.</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Image src="/marketing/book-cover.jpg" alt="Photo book cover" width={1400} height={1121} className="w-full rounded-[3px]" />
                  <Image src="/marketing/book-day.jpg" alt="Photo book page with a route map, stats and elevation" width={1400} height={1123} className="w-full rounded-[3px]" />
                </div>
              </Reveal>
              <Reveal delay={160} className="panel overflow-hidden p-6 md:p-8">
                <div className="x-eyebrow">The posts</div>
                <h3 className="x-h3 mt-2">Instagram and Facebook, sized and captioned.</h3>
                <div className="mt-5 flex gap-3">
                  {["ig-cover", "ig-map", "ig-stats"].map((f) => (
                    <Image key={f} src={`/marketing/${f}.jpg`} alt="" width={540} height={675} className="w-1/3 rounded-[3px]" />
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="sec scroll-mt-16">
        <div className="wrap">
          <Reveal className="max-w-2xl">
            <div className="x-eyebrow">Pricing</div>
            <h2 className="x-h2 mt-4">Basically free.</h2>
            <p className="x-lead x-muted mt-4">Digital stories cost nothing. You only pay for paper.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Reveal className="panel flex flex-col p-7">
              <div className="x-eyebrow">Digital</div>
              <div className="mt-4 font-[family-name:var(--font-archivo)] text-[3.4rem] font-black leading-none [font-stretch:125%]">$0</div>
              <ul className="mt-6 flex-1 space-y-2.5 text-[0.98rem]">
                {["Online story over a 3D map", "Instagram and Facebook posts", "Invite your crew", "Private share link"].map((x) => <Li key={x}>{x}</Li>)}
              </ul>
              <Link href="/app" className="s-btn mt-8 w-full">Start free</Link>
              <p className="mt-3 text-center text-[0.78rem] text-[var(--dust-s)]">Generous free limits.</p>
            </Reveal>
            <Reveal delay={90} className="panel flex flex-col border-[var(--flame)]/50 p-7">
              <div className="x-eyebrow">Printed book</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-archivo)] text-[3.4rem] font-black leading-none [font-stretch:125%]">$25</span>
                <span className="text-[var(--dust-s)]">per copy</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-[0.98rem]">
                {["Full-colour photo book", "Your maps, photos and words", "One for every rider in the crew", "Shipping extra"].map((x) => <Li key={x}>{x}</Li>)}
              </ul>
              <Link href="/app" className="s-btn s-btn-ghost mt-8 w-full">Make a book</Link>
            </Reveal>
            <Reveal delay={160} className="panel flex flex-col p-7">
              <div className="x-eyebrow">Clubs, shops and tour operators</div>
              <div className="mt-4 font-[family-name:var(--font-archivo)] text-[2.2rem] font-black leading-none [font-stretch:125%]">Let&apos;s talk</div>
              <ul className="mt-6 flex-1 space-y-2.5 text-[0.98rem]">
                {["A story for every trip you run", "Your branding on every story", "Books for the whole group"].map((x) => <Li key={x}>{x}</Li>)}
              </ul>
              <a href="mailto:hello@theridestory.com?subject=The%20Ride%20Story%20for%20our%20group" className="s-btn s-btn-ghost mt-8 w-full">Get in touch</a>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="border-t border-[var(--bone-s)]/10 pt-5">
                <h3 className="x-h3 !text-[1.1rem]">{q}</h3>
                <p className="x-muted mt-2 text-[0.96rem]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor */}
      <section className="border-y border-[var(--bone-s)]/10 bg-[var(--carbon)]/70">
        <div className="wrap flex flex-col items-start gap-5 py-10 md:flex-row md:items-center md:justify-between">
          <a href={SPONSOR.url("homepage-band")} target="_blank" rel="noreferrer" className="flex items-center gap-5">
            <span className="x-mono text-[0.72rem] uppercase tracking-[0.16em] text-[var(--dust-s)]">Sponsored by</span>
            <Image src={SPONSOR.logo} alt={SPONSOR.name} width={649} height={100} className="trs-sponsor-logo h-8 w-auto" />
          </a>
          <p className="max-w-md text-[0.95rem] text-[var(--bone-s)]/75">Epoch Cycling helps riders understand their bodies, fuel properly and find their edge.</p>
          <a href={SPONSOR.url("homepage-button")} target="_blank" rel="noreferrer" className="s-btn s-btn-ghost s-btn-sm">Visit Epoch Cycling <Arr /></a>
        </div>
      </section>

      {/* CTA */}
      <section className="sec">
        <div className="wrap text-center">
          <Reveal>
            <h2 className="x-display mx-auto max-w-[14ch] !text-[clamp(2.6rem,7vw,6.5rem)]">Your last ride is still on your phone.</h2>
            <div className="mt-10 flex justify-center">
              <Link href="/app" className="s-btn">Start free <Arr /></Link>
            </div>
          </Reveal>
        </div>
      </section>

      </main>

      <SiteFooter />
      <PalettePicker />
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[0.7em] h-[2px] w-3 flex-none bg-[var(--flame)]" />
      <span>{children}</span>
    </li>
  );
}
