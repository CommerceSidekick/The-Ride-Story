import type { Metadata } from "next";

const EXAMPLES: Record<string, { title: string; description: string; image: string }> = {
  oaxaca: {
    title: "Sierra Norte, Oaxaca — an example ride story",
    description: "Three days of mountain biking in Oaxaca's Sierra Norte, four riders, told over a 3D map. Made with The Ride Story.",
    image: "/marketing/example-oaxaca.jpg",
  },
  ventoux: {
    title: "Mont Ventoux — an example ride story",
    description: "Bédoin to the summit of Mont Ventoux and back via Malaucène, 55 km, told over a 3D map. Made with The Ride Story.",
    image: "/marketing/example-ventoux.jpg",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ex = EXAMPLES[(await params).slug];
  if (!ex) return { title: "Example story — The Ride Story" };
  return { title: ex.title, description: ex.description, openGraph: { title: ex.title, description: ex.description, images: [ex.image] } };
}

export default function ExampleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
