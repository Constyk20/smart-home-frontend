import { useState, type ReactNode } from "react";
import { DeviceCard } from "../../components/DeviceCard";
import { Icon } from "../../components/ui/Icon";
import { SCENES } from "../../lib/scenes";
import type { HouseData } from "../../hooks/useHouse";
import type { SceneFocus } from "../../components/HouseScene";
import type { SectionId } from "../../components/shell/AppShell";
import type { Category } from "../../components/dashboard/SmartHomeCard";
import type { Device } from "../../types";

export type SectionProps = {
  houseId: string;
  house: HouseData;
  roomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenDevice: (device: Device) => void;
  /** Camera focus in the 3D house (null = full house). */
  focus: SceneFocus | null;
  onFocusDevice: (device: Device) => void;
  onFocusRoom: (roomId: string) => void;
  onResetFocus: () => void;
  onNavigate: (section: SectionId) => void;
  onOpenCategory: (category: Category) => void;
  listening: boolean;
  onOpenVoice: () => void;
  automated: ReadonlySet<string>;
  roomNames: ReadonlyMap<string, string>;
};

export const CARD = "rounded-xl border border-line bg-card shadow-sm";

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

type SummaryProps = { label: string; value: string; sub?: string; tag?: string };

export function SummaryCard({ label, value, sub, tag }: SummaryProps) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {tag && <span className="rounded-full bg-field px-2 py-0.5 text-[10px] font-medium text-ink-2">{tag}</span>}
      </div>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function DeviceGrid({ devices, props, empty }: { devices: Device[]; props: SectionProps; empty: string }) {
  const { house, roomNames, automated, onOpenDevice } = props;
  if (devices.length === 0) return <p className={`${CARD} px-4 py-6 text-center text-sm text-muted`}>{empty}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          roomName={roomNames.get(device.room_id) ?? "No room"}
          automated={automated.has(device.id)}
          busy={house.pending.has(device.id)}
          onToggle={house.toggle}
          onPatch={house.patchState}
          onOpen={onOpenDevice}
          onFocus={props.onFocusDevice}
        />
      ))}
    </ul>
  );
}

const SCENE_ICON = { bulb: "bulb", shield: "shield", moon: "moon", sofa: "sofa" } as const;

/** One-click scenes. Each is just a batch of normal device updates, so nothing here is cosmetic. */
export function ScenesCard({ house }: { house: HouseData }) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function run(sceneId: string) {
    const scene = SCENES.find((item) => item.id === sceneId);
    if (!scene) return;
    const changes = scene.plan(house.devices, house.rooms);
    if (changes.length === 0) {
      setMessage(`${scene.name}: nothing to change.`);
      return;
    }
    setBusyId(scene.id);
    setMessage("");
    const done = await house.applyChanges(changes);
    setBusyId("");
    setMessage(`${scene.name}: ${done} of ${changes.length} device${changes.length === 1 ? "" : "s"} updated.`);
  }

  return (
    <section className={`${CARD} p-4`}>
      <SectionTitle title="Scenes" hint="One tap changes several devices at once through the normal device API." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SCENES.map((scene) => {
          const count = scene.plan(house.devices, house.rooms).length;
          const busy = busyId === scene.id;
          return (
            <li key={scene.id} className="flex flex-col justify-between rounded-lg bg-field p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-brand">
                  <Icon name={SCENE_ICON[scene.icon]} size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{scene.name}</p>
                  <p className="text-xs text-muted">{scene.description}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{count === 0 ? "Already set" : `${count} device${count === 1 ? "" : "s"} will change`}</span>
                <button
                  type="button"
                  disabled={busyId !== "" || count === 0}
                  onClick={() => void run(scene.id)}
                  className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-ink disabled:opacity-50"
                >
                  {busy ? "Applying…" : "Activate"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {message && (
        <p role="status" className="mt-3 text-sm text-ink-2">
          {message}
        </p>
      )}
    </section>
  );
}
