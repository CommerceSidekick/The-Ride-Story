"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookPageView } from "@/components/BookPageView";
import { Logo } from "@/components/Logo";
import { analyze } from "@/lib/analyze";
import { SIZES } from "@/lib/book";
import { store } from "@/lib/store";
import type { TripBundle } from "@/lib/types";

export default function PublishedBook() {
  const { slug } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<TripBundle | null | undefined>(undefined);
  useEffect(() => {
    store.getPublished(slug).then(setBundle).catch(() => setBundle(null));
  }, [slug]);
  const a = useMemo(() => (bundle ? analyze(bundle.trip, bundle.rides, bundle.media) : null), [bundle]);

  if (bundle === undefined) return <div className="grid flex-1 place-items-center bg-loam text-dust">Opening the book…</div>;
  const book = bundle?.trip.book;
  if (!bundle || !a || !book)
    return (
      <div className="grid flex-1 place-items-center bg-loam p-6 text-center text-bone">
        <div>
          <p className="font-display text-3xl font-semibold">This book isn&apos;t published</p>
          <p className="mt-2 text-sm text-dust">The link may be wrong, or the owner unpublished it.</p>
          <Link href="/" className="btn btn-primary mt-5">The Ride Story home</Link>
        </div>
      </div>
    );
  const size = SIZES[book.config.size];
  const clips = bundle.media.filter((m) => m.kind === "video" && !m.hidden && m.videoUrl);
  const url = typeof window !== "undefined" ? window.location.href : null;
  return (
    <div className="print-root flex-1 bg-loam pb-16">
      <style>{`@page { size: ${size.w}in ${size.h}in; margin: 0; }`}</style>
      <header className="no-print mx-auto flex max-w-5xl items-center justify-between px-5 py-4 text-bone">
        <Link href="/"><Logo size={24} /></Link>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Print / PDF</button>
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
