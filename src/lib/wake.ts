import { useSyncExternalStore } from "react";
import { API_ORIGIN } from "../api";

/**
 * Free hosting (Render and similar) puts the backend to sleep when idle, and the first
 * request can take a minute. We ping the server's /health as soon as the site opens,
 * so it is usually awake by the time someone finishes typing their password.
 */
export type WakeStatus = "waking" | "slow" | "ready" | "failed";

const TRY_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 3_000;
const SLOW_AFTER_MS = 15_000;
const GIVE_UP_AFTER_MS = 120_000;

let status: WakeStatus = "waking";
let started = false;
let attempt = 0;
const listeners = new Set<() => void>();

function set(next: WakeStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

/**
 * True once the server answers. A normal request is tried first. If the browser blocks the
 * reply (the backend's CORS list does not include this site yet), a second "no-cors" request
 * still tells us the server is awake, because it only needs the request to get through.
 */
async function ping(): Promise<boolean> {
  const url = `${API_ORIGIN}/health`;
  for (const mode of ["cors", "no-cors"] as const) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TRY_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store", mode });
      if (mode === "no-cors") return true; // opaque reply: the server is reachable
      if (response.ok) return true;
      return false; // a real error status (for example 502 while waking): keep waiting
    } catch {
      // network failure, timeout, or CORS block: fall through to the next mode
    } finally {
      window.clearTimeout(timer);
    }
  }
  return false;
}

async function run(id: number) {
  const startedAt = Date.now();
  while (id === attempt) {
    if (await ping()) {
      if (id === attempt) set("ready");
      return;
    }
    const waited = Date.now() - startedAt;
    if (waited > GIVE_UP_AFTER_MS) {
      if (id === attempt) set("failed");
      return;
    }
    // After a while stop blocking the form: signing in is allowed to try for itself.
    if (waited > SLOW_AFTER_MS && id === attempt) set("slow");
    await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
  }
}

/** Start waking the backend. Safe to call more than once; only the first call does anything. */
export function wakeBackend() {
  if (started) return;
  started = true;
  void run(++attempt);
}

/** Try again after a failure (used by the "Try again" button). */
export function retryWake() {
  started = true;
  set("waking");
  void run(++attempt);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBackendStatus(): WakeStatus {
  return useSyncExternalStore(subscribe, () => status, () => status);
}