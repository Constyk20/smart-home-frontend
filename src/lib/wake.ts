import { useSyncExternalStore } from "react";
import { API_ORIGIN } from "../api";

/**
 * Free hosting (Render and similar) puts the backend to sleep when idle, and the first
 * request can take a minute. We ping the server's /health as soon as the site opens,
 * so it is usually awake by the time someone finishes typing their password.
 */
export type WakeStatus = "waking" | "ready" | "failed";

const TRY_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 3_000;
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

async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TRY_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ORIGIN}/health`, { signal: controller.signal, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

async function run(id: number) {
  const startedAt = Date.now();
  while (id === attempt) {
    if (await ping()) {
      if (id === attempt) set("ready");
      return;
    }
    if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
      if (id === attempt) set("failed");
      return;
    }
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
