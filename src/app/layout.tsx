import type { Metadata } from "next";
import { Archivo, Barlow, Fraunces, Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { paletteBootScript } from "@/lib/palettes";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://theridestory.com"),
  title: "The Ride Story — The ride was epic. We'll help tell the story.",
  description:
    "MTB, cycling and moto. Connect Strava or any GPS, add your photos, and get an online story over a 3D map, posts for Instagram and Facebook, and a printed book. Your first story is free.",
  openGraph: { title: "The Ride Story — The ride was epic. We'll help tell the story.", images: ["/og.jpg"], siteName: "The Ride Story" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${archivo.variable} ${barlow.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: paletteBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
