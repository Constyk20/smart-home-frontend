import { useEffect, useState } from "react";
import { api } from "../api";

export type MlStatus = {
  trained: boolean;
  trained_at?: string | null;
  synthetic: boolean;
  metrics?: { accuracy: number; baseline_majority_accuracy: number; beats_majority_baseline: boolean } | null;
};

/** Status of the trained usage model, from the existing /ml/status endpoint. */
export function useMlStatus(houseId: string, refreshKey: number) {
  const [status, setStatus] = useState<MlStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<MlStatus>(`/houses/${houseId}/ml/status`)
      .then((response) => {
        if (cancelled) return;
        setStatus(response.data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [houseId, refreshKey]);

  return { status, loading, failed };
}
