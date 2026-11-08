import { useActivity } from "../hooks/useActivity";
import { SkeletonRow } from "./ui/Skeleton";

type Props = { houseId: string; refreshKey: number };

export function ActivityPanel({ houseId, refreshKey }: Props) {
  const { rows, loading, error } = useActivity(houseId, refreshKey, 20);

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 text-sm shadow-sm">
      <h2 className="text-base font-semibold">Activity</h2>
      <p className="mt-1 text-muted">Recorded commands and automation changes. Simulated events, not a security audit.</p>
      {error && <p className="mt-2 text-danger">{error}</p>}
      {loading ? (
        <div className="mt-3 space-y-3" role="status" aria-label="Loading activity">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <p>{row.message}</p>
              <p className="text-xs text-muted">{row.action} · {new Date(row.created_at).toLocaleString()}</p>
            </li>
          ))}
          {rows.length === 0 && !error && <li className="text-muted">No activity yet.</li>}
        </ul>
      )}
    </section>
  );
}
