"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountChip, AuthGate } from "@/components/AuthGate";
import { Logo } from "@/components/Logo";
import { createSampleTrip } from "@/lib/sample";
import { store } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { RIDER_COLORS, shortCode, uid } from "@/lib/util";

export default function Dashboard() {
  return (
    <AuthGate>
      <Trips />
    </AuthGate>
  );
}

function Trips() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [you, setYou] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    store.listTrips().then(setTrips).catch((e) => { setError(e.message); setTrips([]); });
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("Creating…");
    try {
      const now = Date.now();
      const trip: Trip = {
        id: uid(), name: name.trim(), location: location.trim(), utcOffsetMin: -new Date().getTimezoneOffset(), units: "metric",
        crew: [{ id: uid(), name: you.trim() || "Me", color: RIDER_COLORS[0] }],
        notes: "", dayNotes: {}, inviteCode: shortCode(), createdAt: now, updatedAt: now,
      };
      await store.saveTrip(trip);
      router.push(`/app/trip/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create trip");
      setBusy("");
    }
  };

  const sample = async () => {
    try {
      const trip = await createSampleTrip(setBusy);
      router.push(`/app/trip/${trip.id}?tab=book`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the sample");
      setBusy("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <AccountChip />
      </header>
      <h1 className="mt-10 font-display text-4xl font-semibold tracking-tight">Your trips</h1>
      {error && <p className="mt-3 rounded-lg bg-clay/10 px-4 py-2 text-sm text-clay">{error}</p>}

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {trips === null && <p className="text-dust">Loading…</p>}
          {trips?.length === 0 && (
            <div className="card col-span-full p-8 text-center">
              <p className="font-display text-2xl font-semibold">No trips yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-dust">Start one on the right, or open the sample to see a finished storybook built from three made-up days in Oaxaca.</p>
              <button className="btn btn-dark mt-5" onClick={sample} disabled={!!busy}>{busy || "Open the Oaxaca sample"}</button>
            </div>
          )}
          {trips?.map((t) => (
            <Link key={t.id} href={`/app/trip/${t.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="label">{t.location || "No location"}{t.sample ? " · sample" : ""}</div>
              <div className="mt-1 font-display text-2xl font-semibold group-hover:text-clay">{t.name}</div>
              <div className="mt-3 flex -space-x-1.5">
                {t.crew.slice(0, 8).map((c) => (
                  <span key={c.id} title={c.name} className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#fffdf8] text-[11px] font-bold text-white" style={{ background: c.color }}>{c.name[0]?.toUpperCase()}</span>
                ))}
              </div>
              <div className="mt-3 text-xs text-dust">
                {t.book ? `${t.book.pages.length}-page book` : "No book yet"} · {t.social ? `${t.social.posts.length} posts` : "no posts yet"}
              </div>
            </Link>
          ))}
        </div>

        <form onSubmit={create} className="card h-fit p-5">
          <div className="font-display text-xl font-semibold">New trip</div>
          <label className="label mt-4 block">Trip name</label>
          <input className="field mt-1" required placeholder="Oaxaca 2026" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label mt-3 block">Where</label>
          <input className="field mt-1" placeholder="Sierra Norte, Oaxaca, México" value={location} onChange={(e) => setLocation(e.target.value)} />
          <label className="label mt-3 block">Your name</label>
          <input className="field mt-1" placeholder="How you appear in the crew" value={you} onChange={(e) => setYou(e.target.value)} />
          <button className="btn btn-primary mt-4 w-full justify-center" disabled={!!busy}>{busy || "Create trip"}</button>
          {trips && trips.length > 0 && !trips.some((t) => t.sample) && (
            <button type="button" className="btn btn-ghost mt-2 w-full justify-center" onClick={sample} disabled={!!busy}>Open the Oaxaca sample</button>
          )}
        </form>
      </div>
    </main>
  );
}
