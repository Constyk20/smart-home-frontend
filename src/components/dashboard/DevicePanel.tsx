import { DeviceControls } from "../DeviceControls";
import { Icon, deviceIcon } from "../ui/Icon";
import { Toggle } from "../ui/Toggle";
import { humanize, isActive, isOpening, statusLabel } from "../../lib/devices";
import type { Device, DeviceState } from "../../types";

type Props = {
  device: Device;
  roomName: string;
  siblings: Device[];
  automated: boolean;
  busy: boolean;
  onToggle: (device: Device) => void;
  onPatch: (device: Device, partial: DeviceState) => Promise<void> | void;
  onFocusDevice: (device: Device) => void;
  onReset: () => void;
};

/** Shown while the camera is focused on a device. Uses the same toggle and patch actions as every other control. */
export function DevicePanel({ device, roomName, siblings, automated, busy, onToggle, onPatch, onFocusDevice, onReset }: Props) {
  const active = isActive(device);
  const index = siblings.findIndex((item) => item.id === device.id);
  const step = (offset: number) => {
    if (siblings.length < 2) return;
    onFocusDevice(siblings[(index + offset + siblings.length) % siblings.length]);
  };

  return (
    <section className="anim-fade rounded-xl border border-brand/30 bg-card p-4 shadow-sm" aria-label={`${device.name} controls`}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-ink">
          <Icon name="back" size={16} />
          Full house
        </button>
        {siblings.length > 1 && (
          <div className="flex items-center gap-1" role="group" aria-label="Devices in this room">
            <button type="button" aria-label="Previous device" onClick={() => step(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-field hover:bg-field-strong">
              <Icon name="back" size={16} />
            </button>
            <span className="text-xs text-muted">
              {index + 1} / {siblings.length}
            </span>
            <button type="button" aria-label="Next device" onClick={() => step(1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-field hover:bg-field-strong">
              <Icon name="back" size={16} className="rotate-180" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${active ? "bg-brand text-white" : "bg-field text-muted"}`}>
          <Icon name={deviceIcon(device.device_type)} size={24} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{device.name}</h2>
          <p className="text-xs text-muted">
            {humanize(device.device_type)} · {roomName}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-field px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-ink">{busy ? "Updating…" : statusLabel(device)}</p>
          <p className="text-xs text-muted">{isOpening(device.device_type) ? "Open or close" : "Power"}</p>
        </div>
        <Toggle checked={active} disabled={busy} label={`${device.name} ${isOpening(device.device_type) ? "open" : "on"}`} onChange={() => onToggle(device)} />
      </div>

      <div className="mt-3">
        <DeviceControls device={device} disabled={busy} onPatch={onPatch} />
      </div>

      {device.state?.is_locked !== undefined && (
        <p className="mt-3 text-xs text-muted">Lock: {device.state.is_locked ? "locked" : "unlocked"} (reported by the device)</p>
      )}
      {automated && <p className="mt-3 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">Used by an automation or schedule</p>}
      <p className="mt-3 text-xs text-muted">Simulated device. Changes go through the API and appear in Activity.</p>
    </section>
  );
}
