import { useState, type SubmitEvent } from "react";
import type { VoiceApi, VoiceStatus } from "../hooks/useVoice";

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Ready",
  listening: "Listening…",
  working: "Working…",
  ok: "Done",
  error: "Needs attention",
};

const STATUS_STYLE: Record<VoiceStatus, string> = {
  idle: "bg-field text-muted",
  listening: "bg-brand-soft text-brand-ink",
  working: "bg-brand-soft text-brand-ink",
  ok: "bg-ok-soft text-ok",
  error: "bg-danger-soft text-danger",
};

/** The header voice popover: Listen button plus a typed-command box that works in every browser. */
export function VoicePanel({ voice }: { voice: VoiceApi }) {
  const { listening, heard, reply, status, speechSupported, braveBlocked, toggleMic, runText } = voice;
  const [typed, setTyped] = useState("");

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = typed;
    setTyped("");
    await runText(text);
  }

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 shadow-sm text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Voice</h2>
        <span role="status" aria-live="polite" className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <p className="mt-1 text-muted">Browser speech-to-text plus name matching. Not a machine-learning model.</p>

      {braveBlocked && (
        <p className="mt-2 rounded bg-warn-soft px-3 py-2 text-warn">
          You are using Brave, which blocks the speech service behind the Listen button. Voice works in Chrome or Edge.
          Typed commands work everywhere.
        </p>
      )}
      {!speechSupported && !braveBlocked && (
        <p className="mt-2 text-warn">This browser has no speech recognition. Typed commands still work.</p>
      )}

      <button
        className="mt-3 rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-1 disabled:opacity-50"
        disabled={!speechSupported}
        onClick={() => void toggleMic()}
      >
        {listening ? "Stop" : "Listen"}
      </button>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg bg-field px-3 py-1"
          placeholder="e.g. turn on living room light"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button className="rounded-lg bg-field-strong text-ink hover:bg-line px-3 py-1" type="submit">Run</button>
      </form>

      {heard && <p className="mt-2">Heard: {heard}</p>}
      {reply && <p className="text-muted">{reply}</p>}
    </section>
  );
}
