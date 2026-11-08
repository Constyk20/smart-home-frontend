import { useActivity } from "../../hooks/useActivity";
import { Icon, type IconName } from "../ui/Icon";
import { SkeletonRow } from "../ui/Skeleton";
import { relativeTime } from "../../lib/time";
import { useNow } from "../../hooks/useNow";

type Props = { houseId: string; refreshKey: number; onOpenAll: () => void };

function iconFor(action: string): IconName {
  if (action.includes("automation") || action.includes("schedule")) return "clock";
  if (action.includes("security") || action.includes("door")) return "shield";
  if (action.includes("state") || action.includes("device")) return "power";
  return "bolt";
}

export function ActivityCard({ houseId, refreshKey, onOpenAll }: Props) {
  const { rows, loading, error } = useActivity(houseId, refreshKey, 6);
  const now = useNow(60_000);

  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm" aria-label="Activity">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Activity</h2>
        <button type="button" onClick={onOpenAll} className="text-xs font-medium text-brand hover:text-brand-ink">
          See all
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading activity">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-field text-ink-2">
                <Icon name={iconFor(row.action)} size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink">{row.message}</p>
                <p className="text-xs text-muted">{relativeTime(row.created_at, now)}</p>
              </div>
            </li>
          ))}
          {rows.length === 0 && !error && <li className="text-sm text-muted">No activity yet. Switch a device to start the log.</li>}
        </ul>
      )}
    </section>
  );
}
