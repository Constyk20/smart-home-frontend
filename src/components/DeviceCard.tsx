import { DeviceControls } from "./DeviceControls";
import { Icon, deviceIcon } from "./ui/Icon";
import { Toggle } from "./ui/Toggle";
import { hasControls, humanize, isActive, isOpening, statusLabel } from "../lib/devices";
import type { Device, DeviceState } from "../types";

type Props = {
  device: Device;
  roomName: string;
  automated: boolean;
  busy: boolean;
  onToggle: (device: Device) => void;
  onPatch: (device: Device, partial: DeviceState) => Promise<void> | void;
  onOpen: (device: Device) => void;
  onFocus: (device: Device) => void;
};

export function DeviceCard({ device, roomName, automated, busy, onToggle, onPatch, onOpen, onFocus }: Props) {
  const active = isActive(device);
  const verb = isOpening(device.device_type) ? "open" : "on";

  return (
    <li
      className={`rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md ${
        active ? "border-brand/40" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onOpen(device)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-label={`Open details for ${device.name}`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              active ? "bg-brand text-white" : "bg-field text-muted"
            }`}
          >
            <Icon name={deviceIcon(device.device_type)} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{device.name}</span>
            <span className="block truncate text-xs text-muted">
              {roomName} · {humanize(device.device_type)}
            </span>
          </span>
        </button>
        <Toggle
          checked={active}
          disabled={busy}
          label={`${device.name} ${verb}`}
          onChange={() => onToggle(device)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-medium ${active ? "text-brand-ink" : "text-muted"}`}>
          <span className={`h-2 w-2 rounded-full ${active ? "bg-brand" : "bg-faint/60"}`} />
          {busy ? "Updating…" : statusLabel(device)}
        </span>
        {automated && (
          <span className="rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand-ink">Automated</span>
        )}
        <button
          type="button"
          onClick={() => onFocus(device)}
          aria-label={`Show ${device.name} in the 3D house`}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-brand hover:bg-brand-soft"
        >
          <Icon name="cube" size={13} />
          3D
        </button>
      </div>

      {hasControls(device.device_type) && (
        <div className="mt-3">
          <DeviceControls device={device} disabled={busy} onPatch={onPatch} />
        </div>
      )}
    </li>
  );
}
