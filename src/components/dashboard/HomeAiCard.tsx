import type { VoiceApi } from "../../hooks/useVoice";
import { useMlStatus } from "../../hooks/useMlStatus";
import { Icon } from "../ui/Icon";
import { SkeletonLines } from "../ui/Skeleton";

type Props = {
  houseId: string;
  refreshKey: number;
  voice: VoiceApi;
  /** Opens the typed-command popover (used when this browser cannot listen). */
  onOpenVoice: () => void;
  onOpenDetails: () => void;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Shows only what exists: the trained usage model's status and the voice-command entry point. */
export function HomeAiCard({ houseId, refreshKey, voice, onOpenVoice, onOpenDetails }: Props) {
  const { status, loading, failed } = useMlStatus(houseId, refreshKey);
  const { listening, status: voiceStatus, heard, reply, speechSupported, braveBlocked } = voice;
  const canListen = speechSupported && !braveBlocked;

  // Tapping the orb listens right away. Browsers that cannot listen get the typed-command popover instead.
  function onOrb() {
    if (canListen) void voice.toggleMic();
    else onOpenVoice();
  }

  const caption = listening
    ? "Listening… say “turn on kitchen light”"
    : voiceStatus === "working"
      ? "Working…"
      : heard
        ? `Heard: “${heard}”`
        : canListen
          ? "Tap the mic and speak"
          : "Voice listening is not available in this browser";

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm" aria-label="Home AI">
      <h2 className="text-base font-semibold text-ink">Home AI</h2>

      <div className="mt-3 flex flex-col items-center text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          {listening && (
            <>
              <span aria-hidden="true" className="anim-wave absolute inset-0 rounded-full bg-brand/30" />
              <span aria-hidden="true" className="anim-wave absolute inset-0 rounded-full bg-brand/30" style={{ animationDelay: "0.7s" }} />
              <span aria-hidden="true" className="anim-wave absolute inset-0 rounded-full bg-brand/30" style={{ animationDelay: "1.4s" }} />
            </>
          )}
          <button
            type="button"
            onClick={onOrb}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : canListen ? "Start voice command" : "Open typed commands"}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-brand-ink shadow-lg transition-transform active:scale-95 ${
              listening ? "anim-orb ring-4 ring-brand/30" : ""
            }`}
            style={{ background: "radial-gradient(circle at 35% 28%, #ffffff 0%, #b7d1ff 38%, #2f6fe0 100%)" }}
          >
            <Icon name="mic" size={30} />
          </button>
        </div>
        <p className="mt-3 text-sm font-medium text-ink" role="status" aria-live="polite">
          {caption}
        </p>
        {voiceStatus === "error" && reply && <p className="mt-1 text-xs text-danger">{reply}</p>}
        {voiceStatus === "ok" && reply && <p className="mt-1 text-xs text-ok">{reply}</p>}
        {!canListen && (
          <button type="button" onClick={onOpenVoice} className="mt-1 text-xs font-medium text-brand hover:text-brand-ink">
            Type a command instead
          </button>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-field p-3 text-xs" role="status" aria-label="Usage model status">
        {loading ? (
          <SkeletonLines lines={2} />
        ) : failed || !status ? (
          <p className="text-muted">Usage model status is unavailable right now.</p>
        ) : status.trained ? (
          <>
            <p className="flex items-center gap-1.5 font-medium text-ink">
              <span className="h-2 w-2 rounded-full bg-ok" />
              Usage model trained
            </p>
            {status.metrics && (
              <p className={status.metrics.beats_majority_baseline ? "mt-1 text-ok" : "mt-1 text-warn"}>
                {percent(status.metrics.accuracy)} accuracy vs {percent(status.metrics.baseline_majority_accuracy)} baseline
                {status.metrics.beats_majority_baseline ? "" : " (does not beat it)"}
              </p>
            )}
            {status.synthetic && <p className="mt-1 text-warn">Includes synthetic data.</p>}
          </>
        ) : (
          <p className="text-muted">No usage model trained yet. Train one from the AI details.</p>
        )}
      </div>

      <button type="button" onClick={onOpenDetails} className="mt-3 text-sm font-medium text-brand hover:text-brand-ink">
        AI details and training
      </button>
    </section>
  );
}
