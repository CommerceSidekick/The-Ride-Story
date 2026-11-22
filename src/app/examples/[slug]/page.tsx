"use client";
import { useParams } from "next/navigation";
import { PublishedTrip } from "@/components/published/PublishedTrip";
import type { TripBundle } from "@/lib/types";

/** Built-in example stories, served as static files from /public/examples/<slug>/. */
export default function ExampleStory() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PublishedTrip
      example
      load={async () => {
        if (!/^[a-z0-9-]+$/.test(slug)) return null;
        const res = await fetch(`/examples/${slug}/bundle.json`);
        return res.ok ? ((await res.json()) as TripBundle) : null;
      }}
    />
  );
}
