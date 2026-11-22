"use client";
import { useEffect, useRef } from "react";

/** Fades children up the first time they scroll into view. Content is visible without JS and with reduced motion. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
