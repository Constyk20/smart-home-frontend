import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CARD, SectionTitle, SummaryCard, type SectionProps } from "./shared";

export function EnergySection({ house }: SectionProps) {
  const { energy, history } = house;
  const hasHistory = history.some((day) => day.kwh > 0);
  const top = energy ? Math.max(...energy.devices.map((d) => d.estimated_kwh_today), 0) : 0;

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-brand-soft px-4 py-2 text-sm text-brand-ink">
        These figures are estimates from each device&apos;s rated wattage and logged runtime (Africa/Lagos days). They are not
        meter readings or a utility bill.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryCard label="Used today" tag="Estimated" value={energy ? `${energy.total_kwh_today} kWh` : "…"} />
        <SummaryCard label="Cost today" tag="Estimated" value={energy ? `₦${energy.total_cost_today}` : "…"} />
        <SummaryCard label="Tariff" value={energy ? `₦${energy.tariff_per_kwh}` : "…"} sub="per kWh" />
      </div>

      <section className={`${CARD} p-4`}>
        <SectionTitle title="Last 7 days" hint="Estimated kWh per day from stored runtime." />
        {hasHistory ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid vertical={false} stroke="#dce6f2" />
                <XAxis dataKey="date" tick={{ fill: "#5a6882", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#5a6882", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip cursor={{ fill: "#eff4fb" }} />
                <Bar dataKey="kwh" fill="#2f6fe0" name="kWh (estimated)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted">No usage recorded in the last 7 days yet. Switch some devices on to start the record.</p>
        )}
      </section>

      <section className={`${CARD} p-4`}>
        <SectionTitle title="By device today" />
        <ul className="space-y-3">
          {energy?.devices.map((device, index) => (
            <li key={`${device.device_name}-${index}`} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-ink">{device.device_name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {device.estimated_kwh_today} kWh · ₦{device.estimated_cost_today} · {device.wattage} W · {device.is_on ? "drawing" : "off"}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-field">
                <div
                  className="h-1.5 rounded-full bg-brand"
                  style={{ width: top > 0 ? `${Math.max(2, (device.estimated_kwh_today / top) * 100)}%` : "0%" }}
                />
              </div>
            </li>
          ))}
          {(!energy || energy.devices.length === 0) && <li className="text-sm text-muted">No energy reading yet.</li>}
        </ul>
      </section>
    </div>
  );
}
