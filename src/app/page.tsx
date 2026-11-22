import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { SiteFooter } from "@/components/site/SiteFooter";
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

      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-center">
        <div className="wrap relative pb-16 pt-32">
          <h1 className="x-display max-w-[12ch] !text-[clamp(3.2rem,10vw,9.5rem)]">The ride was epic.</h1>
          <p className="x-h2 mt-6 !text-[clamp(1.7rem,3.6vw,3.1rem)] text-[#ff5a1f]">We&apos;ll help tell the story.</p>
          <p className="x-lead mt-8 max-w-[44ch] text-[#f2eee6]/85">
            Strava kept the numbers. Your phone kept 600 photos. Your buddies kept the good ones. Throw it all in and we&apos;ll turn it into something worth reading, posting and putting on a shelf.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/app" className="s-btn">Start free <Arr /></Link>
            <a href="#how" className="s-btn s-btn-ghost">How it works</a>
          </div>
          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-[#f2eee6]/10 bg-[#f2eee6]/10 sm:grid-cols-4">
            {[["$0", "Digital stories"], ["$25", "Printed book"], ["3D", "Every route"], ["GPX", "Strava, Garmin, any GPS"]].map(([v, l]) => (
              <div key={l} className="bg-[#0e0f0c]/80 px-5 py-4">
                <dt className="font-[family-name:var(--font-archivo)] text-[1.9rem] font-black leading-none text-[#ff5a1f] [font-stretch:125%]">{v}</dt>
                <dd className="x-mono mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-[#a8a291]">{l}</dd>
              </div>
            ))}
          </dl>
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
                    <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(14,15,12,0.85), rgba(14,15,12,0) 55%)" }} />
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
                <div className="font-[family-name:var(--font-archivo)] text-[3.2rem] font-black leading-none text-[#ff5a1f] [font-stretch:125%]">{n}</div>
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
              <p className="mt-3 text-center text-[0.78rem] text-[#a8a291]">Generous free limits.</p>
            </Reveal>
            <Reveal delay={90} className="panel flex flex-col border-[#ff5a1f]/50 p-7">
              <div className="x-eyebrow">Printed book</div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-archivo)] text-[3.4rem] font-black leading-none [font-stretch:125%]">$25</span>
                <span className="text-[#a8a291]">per copy</span>
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
              <div key={q} className="border-t border-[#f2eee6]/10 pt-5">
                <h3 className="x-h3 !text-[1.1rem]">{q}</h3>
                <p className="x-muted mt-2 text-[0.96rem]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsor */}
      <section className="border-y border-[#f2eee6]/10 bg-[#0e0f0c]/70">
        <div className="wrap flex flex-col items-start gap-5 py-10 md:flex-row md:items-center md:justify-between">
          <a href={SPONSOR.url("homepage-band")} target="_blank" rel="noreferrer" className="flex items-center gap-5">
            <span className="x-mono text-[0.72rem] uppercase tracking-[0.16em] text-[#a8a291]">Sponsored by</span>
            <Image src={SPONSOR.logo} alt={SPONSOR.name} width={649} height={100} className="h-8 w-auto" />
          </a>
          <p className="max-w-md text-[0.95rem] text-[#f2eee6]/75">Epoch Cycling helps riders understand their bodies, fuel properly and find their edge.</p>
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

      <SiteFooter />
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[0.7em] h-[2px] w-3 flex-none bg-[#ff5a1f]" />
      <span>{children}</span>
    </li>
  );
}
