"use client";
import { useCallback, useEffect, useState } from "react";
import type { ProviderStatus } from "@/lib/connect/types";

const RESULT: Record<string, (name: string) => string> = {
  connected: (n) => `${n} connected.`,
  denied: (n) => `${n} access was cancelled.`,
  expired: (n) => `That ${n} sign-in took too long. Try again.`,
  error: (n) => `${n} sign-in failed. Try again.`,
};

/** Connection status for every service, plus the result of an OAuth round trip that just returned. */
export function useConnections() {
  const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
  const [flash] = useState(() => {
    if (typeof window === "undefined") return null;
    const q = new URLSearchParams(window.location.search);
    const [id, result] = (q.get("connect") ?? "").split(":");
    return id && result ? { id, result, message: q.get("connect_msg") ?? "" } : null;
  });

  const reload = useCallback(() => fetch("/api/connect/status").then((r) => r.json()).then((d) => setProviders(d.providers ?? [])).catch(() => setProviders([])), []);
  useEffect(() => { reload(); }, [reload]);

  const message = (p: ProviderStatus) => (flash?.id === p.id ? flash.message || RESULT[flash.result]?.(p.name) || "" : "");
  const connectUrl = (id: string, returnTo: string) => `/api/connect/${id}/start?return=${encodeURIComponent(returnTo)}`;
  const disconnect = async (id: string) => {
    await fetch(`/api/connect/${id}/disconnect`, { method: "POST" });
    await reload();
  };
  return { providers, reload, message, connectUrl, disconnect };
}
