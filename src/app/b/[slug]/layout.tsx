import type { Metadata } from "next";

export const metadata: Metadata = { title: "A ride story — The Ride Story", robots: { index: false, follow: false } };

export default function PublishedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
