import type { ReactNode } from "react";
import { retryWake, useBackendStatus } from "../../lib/wake";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Tells the person whether the server is awake, so a slow first sign-in is not a mystery. */
export function ServerStatus() {
  const status = useBackendStatus();
  if (status === "ready") return null;

  if (status === "failed") {
    return (
      <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
        <span>The server is not responding. Check your connection, then try again.</span>
        <button type="button" onClick={retryWake} className="shrink-0 font-medium underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div role="status" className="mt-4 flex items-start gap-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-ink">
      <Spinner className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Waking up the server. The first visit can take up to a minute, and you can sign in as soon as this message disappears.</span>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function SubmitButton({ busy, disabled, idle, working }: { busy: boolean; disabled: boolean; idle: string; working: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 font-medium text-white hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy && <Spinner />}
      {busy ? working : idle}
    </button>
  );
}

export const INPUT = "w-full rounded-lg border border-line bg-card px-3 py-2 disabled:opacity-60";
