"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { cloudEnabled, store } from "@/lib/store";

export default function JoinPage() {
  if (!cloudEnabled)
    return (
      <main className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Invites aren&apos;t available here</h1>
          <p className="mt-1 max-w-sm text-sm text-dust">This deployment runs in local mode, where trips live in one browser. Invites work once the cloud backend is connected.</p>
          <Link href="/app" className="btn btn-dark mt-4">Open The Ride Story</Link>
        </div>
      </main>
    );
  return (
    <AuthGate>
      <Join />
    </AuthGate>
  );
}

function Join() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState("Joining the trip…");
  useEffect(() => {
    store.joinTrip(code)
      .then((id) => (id ? router.replace(`/app/trip/${id}`) : setMsg("That invite link isn't valid any more. Ask for a fresh one.")))
      .catch((e) => setMsg(e instanceof Error ? e.message : "Could not join"));
  }, [code, router]);
  return <div className="grid flex-1 place-items-center p-6 text-dust">{msg}</div>;
}
