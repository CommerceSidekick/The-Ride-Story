"use client";
import { useParams } from "next/navigation";
import { PublishedTrip } from "@/components/published/PublishedTrip";
import { store } from "@/lib/store";

export default function PublishedBook() {
  const { slug } = useParams<{ slug: string }>();
  return <PublishedTrip load={() => store.getPublished(slug)} />;
}
