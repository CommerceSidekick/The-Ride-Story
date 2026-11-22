"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { StoryView } from "@/components/StoryView";
import { analyze } from "@/lib/analyze";
import { store } from "@/lib/store";
import type { TripBundle } from "@/lib/types";

/** Preview of the online story, exactly as the published link shows it. */
export default function StoryPreview() {
  return (
    <AuthGate>
      <Preview />
    </AuthGate>
  );
}

function Preview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<TripBundle | null | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const trip = await store.getTrip(id);
      setB(trip ? { trip, rides: await store.listRides(id), media: await store.listMedia(id) } : null);
    })().catch(() => setB(null));
  }, [id]);
  const a = useMemo(() => (b ? analyze(b.trip, b.rides, b.media) : null), [b]);
  if (b === undefined) return <div className="grid flex-1 place-items-center bg-[#0e0f0c] text-[#a8a291]">Loading the story…</div>;
  if (!b || !a) return <div className="grid flex-1 place-items-center bg-[#0e0f0c] text-[#a8a291]">Trip not found.</div>;
  return (
    <StoryView
      trip={b.trip}
      a={a}
      book={b.trip.book}
      editHref={`/app/trip/${id}`}
      onShowBook={b.trip.book ? () => router.push(`/app/trip/${id}?tab=book`) : undefined}
    />
  );
}
