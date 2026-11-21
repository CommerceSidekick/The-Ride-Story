"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { cloudEnabled, supabase } from "@/lib/store";
import { Logo } from "./Logo";

/** In cloud mode, require a signed-in user (email magic link). In local mode, render children directly. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(cloudEnabled ? undefined : null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | string>("idle");
  useEffect(() => {
    if (!cloudEnabled) return;
    supabase().auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase().auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!cloudEnabled || user) return <>{children}</>;
  if (user === undefined) return <div className="grid flex-1 place-items-center text-dust">Loading…</div>;
  return (
    <div className="grid flex-1 place-items-center p-6">
      <form
        className="card w-full max-w-sm p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("sending");
          const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
          setState(error ? error.message : "sent");
        }}
      >
        <Logo />
        <h1 className="mt-5 font-display text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-dust">We&apos;ll email you a link. No password.</p>
        <input className="field mt-4" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn btn-primary mt-3 w-full justify-center" disabled={state === "sending" || state === "sent"}>
          {state === "sending" ? "Sending…" : state === "sent" ? "Check your email" : "Email me a link"}
        </button>
        {!["idle", "sending", "sent"].includes(state) && <p className="mt-3 text-sm text-clay">{state}</p>}
      </form>
    </div>
  );
}

export function AccountChip() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!cloudEnabled) return;
    supabase().auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, []);
  if (!cloudEnabled)
    return <span className="rounded-full bg-bone-2 px-3 py-1 text-xs font-medium text-dust" title="No cloud backend configured: trips are stored in this browser only.">Local mode · this browser only</span>;
  return email ? (
    <button className="btn btn-ghost btn-sm" onClick={() => supabase().auth.signOut().then(() => location.assign("/"))} title="Sign out">{email} · Sign out</button>
  ) : null;
}
