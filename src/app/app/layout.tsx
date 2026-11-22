import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your trips — The Ride Story", robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
