import { Icon } from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";
import type { EnergyDay, EnergySummary } from "../../types";

type Props = { energy: EnergySummary | null; history: EnergyDay[]; onOpen: () => void };

export function EnergyCard({ energy, history, onOpen }: Props) {
  const peak = Math.max(...history.map((day) => day.kwh), 0);
  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm" aria-label="Energy usage">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="bolt" size={18} className="text-brand" />
          Energy usage
        </h2>
        <span className="rounded-full bg-field px-2 py-0.5 text-[10px] font-medium text-ink-2">Estimated</span>
      </div>

      {energy === null ? (
        <div className="mt-4 space-y-3" role="status" aria-label="Loading energy">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold text-ink">
            {energy.total_kwh_today} <span className="text-sm font-medium text-muted">kWh today</span>
          </p>
          <p className="text-xs text-muted">₦{energy.total_cost_today} at ₦{energy.tariff_per_kwh}/kWh · from rated wattage, not a meter</p>
          {peak > 0 ? (
            <div className="mt-3 flex h-16 items-end gap-1.5" role="img" aria-label="Estimated kWh for each of the last 7 days">
              {history.map((day) => (
                <div key={day.date} className="flex h-full flex-1 flex-col justify-end" title={`${day.date}: ${day.kwh} kWh`}>
                  <div className="w-full rounded-t bg-brand/80" style={{ height: `${Math.max(6, (day.kwh / peak) * 100)}%` }} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">No usage recorded in the last 7 days yet.</p>
          )}
        </>
      )}

      <button type="button" onClick={onOpen} className="mt-3 text-sm font-medium text-brand hover:text-brand-ink">
        View energy details
      </button>
    </section>
  );
}
