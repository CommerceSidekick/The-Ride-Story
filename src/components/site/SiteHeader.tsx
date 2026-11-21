"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const NAV = [
  ["#stories", "Stories"],
  ["#how", "How it works"],
  ["#what-you-get", "What you get"],
  ["#crew", "For crews"],
] as const;

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{ background: solid || open ? "rgba(14,15,12,0.92)" : "transparent", backdropFilter: solid ? "blur(10px)" : undefined, borderBottom: solid ? "1px solid #2e312b" : "1px solid transparent" }}
    >
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <Link href="/" aria-label="The Ride Story home" className="text-[#f2eee6]">
          <Logo size={30} className="max-[380px]:!w-[190px]" />
        </Link>
        <nav className="hidden items-center gap-8 text-[0.92rem] font-medium lg:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="text-[#f2eee6]/80 transition hover:text-[#f2eee6]">{label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/app" className="hidden text-[0.92rem] font-medium text-[#f2eee6]/80 hover:text-[#f2eee6] sm:block">Sign in</Link>
          <span className="hidden sm:block"><Link href="/app" className="s-btn s-btn-sm">Start your story</Link></span>
          <button className="relative grid h-10 w-10 place-items-center lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="block h-[2px] w-6 bg-[#f2eee6] transition" style={{ transform: open ? "translateY(4px) rotate(45deg)" : "translateY(-3px)" }} />
            <span className="absolute block h-[2px] w-6 bg-[#f2eee6] transition" style={{ transform: open ? "rotate(-45deg)" : "translateY(5px)" }} />
          </button>
        </div>
      </div>
      {open && (
        <nav className="wrap flex flex-col gap-1 pb-6 lg:hidden">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="x-h3 border-b border-[#2e312b] py-4">{label}</a>
          ))}
          <Link href="/app" className="x-h3 py-4">Sign in</Link>
          <Link href="/app" className="s-btn mt-3 self-start">Start your story</Link>
        </nav>
      )}
    </header>
  );
}
