"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookPageView } from "@/components/BookPageView";
import { Logo } from "@/components/Logo";
import { StoryView } from "@/components/StoryView";
import { analyze } from "@/lib/analyze";
import { SIZES } from "@/lib/book";
import { store } from "@/lib/store";
import type { TripBundle } from "@/lib/types";

/** A published trip: the story over the 3D map, with the book one click away. Also used for the built-in examples. */
export function PublishedTrip({ load, example = false }: { load: () => Promise<TripBundle | null>; example?: boolean }) {
  const [bundle, setBundle] = useState<TripBundle | null | undefined>(undefined);
  const [view, setView] = useState<"story" | "book">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "book" ? "book" : "story"));
  useEffect(() => {
    load().then(setBundle).catch(() => setBundle(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const a = useMemo(() => (bundle ? analyze(bundle.trip, bundle.rides, bundle.media) : null), [bundle]);

  if (bundle === undefined) return <div className="grid flex-1 place-items-center bg-loam text-[#a8a291]">Opening the story…</div>;
  const book = bundle?.trip.book;
  if (!bundle || !a)
    return (
      <div className="grid flex-1 place-items-center bg-loam p-6 text-center text-bone">
        <div>
          <h1 className="font-display text-3xl font-semibold">This story isn&apos;t published</h1>
          <p className="mt-2 text-sm text-[#a8a291]">The link may be wrong, or the owner unpublished it.</p>
          <Link href="/" className="btn btn-primary mt-5">The Ride Story home</Link>
        </div>
      </div>
    );
  if (view === "story" || !book)
    return <StoryView trip={bundle.trip} a={a} book={book} example={example} onShowBook={book ? () => { setView("book"); window.scrollTo(0, 0); } : undefined} />;
  const size = SIZES[book.config.size];
  const clips = bundle.media.filter((m) => m.kind === "video" && !m.hidden && m.videoUrl);
  const url = typeof window !== "undefined" ? window.location.href : null;
  return (
    <div className="print-root flex-1 bg-loam pb-16">
      <style>{`@page { size: ${size.w}in ${size.h}in; margin: 0; }`}</style>
      <header className="no-print mx-auto flex max-w-5xl items-center justify-between px-5 py-4 text-bone">
        <Link href="/"><Logo size={24} /></Link>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => { setView("story"); window.scrollTo(0, 0); }}>Back to the story</button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-5 px-3 sm:px-5">
        {book.pages.map((p, i) => (
          <div key={p.id} className="print-wrap">
          <BookPageView
            page={p}
            className="print-page rounded-md shadow-2xl shadow-black/50"
            style={{ ["--print-w" as string]: `${size.w}in`, ["--print-h" as string]: `${size.h}in` }}
            ctx={{ trip: bundle.trip, a, theme: book.config.theme, aspect: size.w / size.h, pageNo: i + 1, publishedUrl: url }}
          />
          </div>
        ))}
        {clips.length > 0 && (
          <section className="no-print pt-8 text-bone">
            <h2 className="font-display text-3xl font-semibold">Clips</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {clips.map((m) => <video key={m.id} src={m.videoUrl} poster={m.url} controls preload="none" className="w-full rounded-lg bg-black" />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
