import { useEffect, useState } from "react";
import { api } from "../api";

export type ActivityRow = { id: string; action: string; message: string; created_at: string };

/** Recent activity for a house. Reloads whenever `refreshKey` changes. */
export function useActivity(houseId: string, refreshKey: number, limit: number) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get<ActivityRow[]>(`/houses/${houseId}/activity?limit=${limit}`)
      .then((response) => {
        if (cancelled) return;
        setRows(response.data);
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [houseId, refreshKey, limit]);

  return { rows, loading, error };
}
