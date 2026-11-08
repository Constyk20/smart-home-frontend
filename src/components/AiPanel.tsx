import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../api";
import { SkeletonLines } from "./ui/Skeleton";

type ModelMetrics = {
  accuracy: number;
  f1: number;
  baseline_majority_accuracy: number;
  beats_majority_baseline: boolean;
  train_rows: number;
  test_rows: number;
  positive_rate_test: number;
};

type ModelInfo = {
  trained: boolean;
  trained_at?: string | null;
  metrics?: ModelMetrics | null;
  n_events?: number | null;
  automation_event_share?: number | null;
  synthetic: boolean;
  notes: string[];
};

type HourPrediction = { hour_start: string; probability_on: number };
type DevicePrediction = { device_id: string; device_name: string; device_type: string; hours: HourPrediction[] };
type PredictionResponse = { model_beats_baseline: boolean; note: string; predictions: DevicePrediction[] };

type AnomalyItem = {
  device_id: string;
  device_name: string;
  date: string;
  on_hours: number;
  typical_on_hours: number;
};
type AnomalyResponse = { devices_checked: number; devices_skipped: number; note: string; anomalies: AnomalyItem[] };

type Props = { houseId: string; onTrained?: () => void };

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function hourLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
}

export function AiPanel({ houseId, onTrained }: Props) {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyResponse | null>(null);
  const [anomalyMessage, setAnomalyMessage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const statusRes = await api.get<ModelInfo>(`/houses/${houseId}/ml/status`);
    setInfo(statusRes.data);

    if (statusRes.data.trained) {
      const predictionRes = await api.get<PredictionResponse>(`/houses/${houseId}/ml/predictions?hours=12`);
      setPredictions(predictionRes.data);
    } else {
      setPredictions(null);
    }

    try {
      const anomalyRes = await api.get<AnomalyResponse>(`/houses/${houseId}/ml/anomalies`);
      setAnomalies(anomalyRes.data);
      setAnomalyMessage("");
    } catch (error) {
      setAnomalies(null);
      setAnomalyMessage(errorMessage(error, "Could not check for unusual days."));
    }
  }, [houseId]);

  useEffect(() => {
    loadAll().catch((error) => setMessage(errorMessage(error, "Could not load the AI status.")));
  }, [loadAll]);

  async function train() {
    setBusy(true);
    setMessage("");
    try {
      await api.post(`/houses/${houseId}/ml/train`);
      await loadAll();
      onTrained?.();
      setMessage("Model trained.");
    } catch (error) {
      setMessage(errorMessage(error, "Training failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 shadow-sm text-sm">
      <h2 className="text-base font-semibold">AI usage model</h2>
      <p className="mt-1 text-muted">
        A trained model estimates how likely each device is to be on at each hour, learned from this house&apos;s logged
        history. These are estimates, not measurements.
      </p>

      {info === null && !message && (
        <div className="mt-3" role="status" aria-label="Loading AI status">
          <SkeletonLines lines={3} />
        </div>
      )}

      {info && !info.trained && <p className="mt-3 text-ink-2">No model has been trained for this house yet.</p>}

      {info?.trained && (
        <div className="mt-3 space-y-1">
          {info.synthetic && (
            <p className="rounded bg-warn-soft px-3 py-2 text-warn">
              Trained partly on synthetic (generated) data. It shows the pipeline works, not real household behaviour.
            </p>
          )}
          {info.trained_at && <p className="text-muted">Trained {new Date(info.trained_at).toLocaleString()}</p>}
          {info.n_events != null && <p className="text-muted">{info.n_events} logged on/off changes used</p>}
          {info.metrics && (
            <>
              <p>
                Held-out accuracy {percent(info.metrics.accuracy)} vs {percent(info.metrics.baseline_majority_accuracy)}{" "}
                for always guessing the most common answer · F1 {info.metrics.f1.toFixed(2)}
              </p>
              <p className={info.metrics.beats_majority_baseline ? "text-ok" : "text-warn"}>
                {info.metrics.beats_majority_baseline
                  ? "Beats the baseline on held-out history."
                  : "Does not beat the baseline. Treat its predictions as unreliable."}
              </p>
            </>
          )}
          {info.automation_event_share != null && info.automation_event_share > 0 && (
            <p className="text-muted">
              {percent(info.automation_event_share)} of the changes came from rules or schedules, not from you.
            </p>
          )}
        </div>
      )}

      <button
        className="mt-3 rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-1 disabled:opacity-50"
        disabled={busy}
        onClick={() => void train()}
      >
        {busy ? "Training…" : info?.trained ? "Retrain model" : "Train model"}
      </button>
      {message && <p className="mt-2 text-ink-2">{message}</p>}

      {predictions && predictions.predictions.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium">Next 12 hours (Lagos time)</h3>
          <p className="text-xs text-muted">{predictions.note}</p>
          {!predictions.model_beats_baseline && (
            <p className="mt-1 text-warn">This model did not beat its baseline, so these numbers are unreliable.</p>
          )}
          <ul className="mt-2 space-y-3">
            {predictions.predictions.map((device) => (
              <li key={device.device_id}>
                <p className="text-ink-2">
                  {device.device_name} <span className="text-xs text-muted">{device.device_type}</span>
                </p>
                <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-12">
                  {device.hours.map((hour) => (
                    <div
                      key={hour.hour_start}
                      className="rounded px-1 py-1 text-center text-xs"
                      style={{ backgroundColor: `rgba(47, 111, 224, ${0.1 + hour.probability_on * 0.5})` }}
                      title={`${hourLabel(hour.hour_start)}: ${percent(hour.probability_on)} chance usually on`}
                    >
                      <div className="text-ink-2">{hourLabel(hour.hour_start).slice(0, 2)}h</div>
                      <div>{percent(hour.probability_on)}</div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-medium">Unusual days</h3>
        {anomalyMessage && <p className="mt-1 text-muted">{anomalyMessage}</p>}
        {anomalies && (
          <>
            <p className="text-xs text-muted">{anomalies.note}</p>
            <ul className="mt-2 space-y-1">
              {anomalies.anomalies.map((item) => (
                <li key={`${item.device_id}-${item.date}`} className="text-ink-2">
                  {item.date} · {item.device_name}: on {item.on_hours} h (usually about {item.typical_on_hours} h)
                </li>
              ))}
              {anomalies.anomalies.length === 0 && (
                <li className="text-muted">
                  {anomalies.devices_checked > 0
                    ? `Nothing unusual among ${anomalies.devices_checked} device(s) checked.`
                    : `No device has enough history yet (${anomalies.devices_skipped} skipped).`}
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
