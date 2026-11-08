import { Icon, type IconName } from "../ui/Icon";
import { isActive } from "../../lib/devices";
import type { Device, Simulation } from "../../types";

export type Category = "lights" | "climate" | "fans" | "security" | "cameras";

type Props = {
  devices: Device[];
  simulation: Simulation | null;
  onOpen: (category: Category) => void;
};

type Row = { id: Category; label: string; icon: IconName; summary: string; detail: string; share: number };

function build(devices: Device[], simulation: Simulation | null): Row[] {
  const ofType = (...types: string[]) => devices.filter((d) => types.includes(d.device_type));
  const lights = ofType("light");
  const ac = ofType("air_conditioner");
  const fans = ofType("fan", "exhaust_fan");
  const openings = ofType("door", "window");
  const cameras = ofType("security_camera");
  const on = (list: Device[]) => list.filter(isActive).length;
  const share = (count: number, total: number) => (total === 0 ? 0 : count / total);

  const acOn = ac.find(isActive);
  const openNow = openings.filter((d) => d.state?.is_open).length;

  return [
    {
      id: "lights",
      label: "Lights",
      icon: "bulb",
      summary: lights.length === 0 ? "None added" : `${on(lights)} On`,
      detail: `of ${lights.length}`,
      share: share(on(lights), lights.length),
    },
    {
      id: "climate",
      label: "Climate",
      icon: "thermo",
      summary: simulation ? `${simulation.environment.temperature}°C` : "…",
      detail: ac.length === 0 ? "No AC · simulated" : acOn ? `AC on · ${acOn.state?.target_temp ?? 24}°C` : "AC off · simulated",
      share: share(on(ac), ac.length),
    },
    {
      id: "fans",
      label: "Fans",
      icon: "wind",
      summary: fans.length === 0 ? "None added" : `${on(fans)} On`,
      detail: `of ${fans.length}`,
      share: share(on(fans), fans.length),
    },
    {
      id: "security",
      label: "Security",
      icon: "shield",
      summary: openings.length === 0 ? "None added" : openNow === 0 ? "All closed" : `${openNow} open`,
      detail: `${openings.length} door/window${openings.length === 1 ? "" : "s"}`,
      share: share(openNow, openings.length),
    },
    {
      id: "cameras",
      label: "Cameras",
      icon: "camera",
      summary: cameras.length === 0 ? "None added" : `${on(cameras)} of ${cameras.length} on`,
      detail: "simulated",
      share: share(on(cameras), cameras.length),
    },
  ];
}

export function SmartHomeCard({ devices, simulation, onOpen }: Props) {
  const rows = build(devices, simulation);
  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-sm" aria-label="Smart Home">
      <h2 className="mb-3 text-base font-semibold text-ink">Smart Home</h2>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-field"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon name={row.icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{row.label}</span>
                  <span className="text-sm font-semibold text-ink">{row.summary}</span>
                </span>
                <span className="mt-1 block h-1 rounded-full bg-field-strong" aria-hidden="true">
                  <span className="block h-1 rounded-full bg-brand transition-all" style={{ width: `${Math.round(row.share * 100)}%` }} />
                </span>
                <span className="mt-0.5 block text-xs text-muted">{row.detail}</span>
              </span>
              <Icon name="back" size={14} className="rotate-180 text-faint" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
