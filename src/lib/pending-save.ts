"use client";

/**
 * Trip edits are saved half a second after the last change. Before a full-page navigation
 * (e.g. an app's sign-in page), call `leaveTo` so nothing still waiting to be saved is lost.
 */
let flush: (() => Promise<void>) | null = null;

export function registerFlush(fn: (() => Promise<void>) | null) {
  flush = fn;
}

export async function leaveTo(url: string) {
  try { await flush?.(); } catch {}
  window.location.assign(url);
}

/** onClick for <a href> links that leave the app. */
export function leaveOnClick(e: { preventDefault(): void; currentTarget: { href: string } }) {
  e.preventDefault();
  void leaveTo(e.currentTarget.href);
}
