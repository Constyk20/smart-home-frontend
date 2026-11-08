import { useMlStatus } from "../../hooks/useMlStatus";
import { Icon } from "../ui/Icon";
import { SkeletonLines } from "../ui/Skeleton";

type Props = {
  houseId: string;
  refreshKey: number;
  listening: boolean;
  onOpenVoice: () => void;
  onOpenDetails: () => void;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Shows only what exists: the trained usage model's status and the voice-command entry point. */
export function HomeAiCard({ houseId, refreshKey, listening, onOpenVoice, onOpenDetails }: Props) {
  const { status, loading, failed } = useMlStatus(houseId, refreshKey);

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm" aria-label="Home AI">
      <h2 className="text-base font-semibold text-ink">Home AI</h2>

      <div className="mt-3 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={onOpenVoice}
          aria-label={listening ? "Listening. Open voice commands." : "Open voice commands"}
          className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg ${listening ? "anim-pulse-ring anim-orb" : ""}`}
          style={{ background: "radial-gradient(circle at 35% 28%, #ffffff 0%, #b7d1ff 38%, #2f6fe0 100%)" }}
        >
          <Icon name="mic" size={30} />
        </button>
        <p className="mt-3 text-sm font-medium text-ink">{listening ? "Listening…" : "Voice commands"}</p>
        <p className="text-xs text-muted">Say &ldquo;turn on kitchen light&rdquo;.</p>
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
