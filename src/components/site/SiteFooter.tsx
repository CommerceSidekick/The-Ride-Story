import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SPONSOR } from "@/lib/sponsor";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--bone-s)]/10 bg-[var(--carbon)]/85 pb-10 pt-16 text-[var(--bone-s)]">
      <div className="wrap">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={34} />
            <p className="x-muted mt-5 max-w-xs text-[0.95rem]">The ride was epic. We&apos;ll help tell the story.</p>
            <a href={SPONSOR.url("footer")} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-3 text-[0.8rem] text-[var(--dust-s)] transition hover:text-[var(--bone-s)]">
              <span className="x-mono uppercase tracking-[0.14em]">Sponsored by</span>
              <Image src={SPONSOR.logo} alt={SPONSOR.name} width={649} height={100} className="trs-sponsor-logo h-5 w-auto" />
            </a>
          </div>
          {[
            ["Ride", [["#mtb", "MTB"], ["#cycling", "Cycling"], ["#moto", "Moto"]]],
            ["Product", [["#how", "How it works"], ["#pricing", "Pricing"], ["/app", "Sign in"], ["mailto:hello@theridestory.com", "hello@theridestory.com"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <div className="x-eyebrow">{title as string}</div>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                {(links as string[][]).map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className="text-[var(--bone-s)]/80 transition hover:text-[var(--flame)]">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-[var(--bone-s)]/10 pt-6 text-[0.8rem] text-[var(--dust-s)] md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} The Ride Story · theridestory.com</span>
          <span>Strava is a trademark of Strava, Inc. The Ride Story is not affiliated with or endorsed by Strava.</span>
        </div>
      </div>
    </footer>
  );
}
