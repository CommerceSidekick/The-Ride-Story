import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#2e312b] bg-[#0e0f0c] pb-10 pt-16 text-[#f2eee6]">
      <div className="wrap">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={34} />
            <p className="x-muted mt-5 max-w-xs text-[0.95rem]">Every ride has a story. We help you capture it and tell it.</p>
          </div>
          {[
            ["Product", [["#how", "How it works"], ["#what-you-get", "What you get"], ["/app", "Start your story"]]],
            ["Stories", [["#solo", "Solo rides"], ["#group", "Group rides"], ["#trip", "Trips"]]],
            ["Company", [["mailto:hello@theridestory.com", "hello@theridestory.com"], ["/app", "Sign in"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <div className="x-eyebrow">{title as string}</div>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                {(links as string[][]).map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className="text-[#f2eee6]/80 transition hover:text-[#e8862a]">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-[#2e312b] pt-6 text-[0.8rem] text-[#a8a291] md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} The Ride Story. theridestory.com</span>
          <span>Strava is a trademark of Strava, Inc. The Ride Story is an independent product and is not affiliated with or endorsed by Strava.</span>
        </div>
      </div>
    </footer>
  );
}
