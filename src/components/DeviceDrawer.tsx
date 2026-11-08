import { useEffect, useRef } from "react";
import { DeviceControls } from "./DeviceControls";
import { Icon, deviceIcon } from "./ui/Icon";
import { Toggle } from "./ui/Toggle";
import { humanize, isActive, isOpening, statusLabel } from "../lib/devices";
import type { Device, DeviceState } from "../types";

type Props = {
  device: Device;
  roomName: string;
  automated: boolean;
  busy: boolean;
  onToggle: (device: Device) => void;
  onPatch: (device: Device, partial: DeviceState) => Promise<void> | void;
  onDelete: (device: Device) => void;
  onShowIn3d: (device: Device) => void;
  onClose: () => void;
};

/** Detail panel for one device. Slides in from the right; full width on phones. */
export function DeviceDrawer({ device, roomName, automated, busy, onToggle, onPatch, onDelete, onShowIn3d, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = isActive(device);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function confirmDelete() {
    if (window.confirm(`Delete ${device.name}? This cannot be undone.`)) onDelete(device);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${device.name} details`}>
      <button
        type="button"
        aria-label="Close details"
        className="anim-fade absolute inset-0 bg-ink/30"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside className="anim-drawer relative flex h-full w-full max-w-sm flex-col gap-5 overflow-y-auto bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
              active ? "bg-brand text-white" : "bg-field text-muted"
            }`}
          >
            <Icon name={deviceIcon(device.device_type)} size={28} />
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-field text-ink-2 hover:bg-field-strong"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-ink">{device.name}</h2>
          <p className="text-sm text-muted">
            {roomName} · {humanize(device.device_type)}
          </p>
          {automated && (
            <p className="mt-2 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-ink">
              Used by an automation or schedule
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-field px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">{busy ? "Updating…" : statusLabel(device)}</p>
            <p className="text-xs text-muted">{isOpening(device.device_type) ? "Open or close" : "Power"}</p>
          </div>
          <Toggle
            checked={active}
            disabled={busy}
            label={`${device.name} ${isOpening(device.device_type) ? "open" : "on"}`}
            onChange={() => onToggle(device)}
          />
        </div>

        <DeviceControls device={device} disabled={busy} onPatch={onPatch} />

        {device.state?.is_locked !== undefined && (
          <p className="text-sm text-muted">Lock: {device.state.is_locked ? "locked" : "unlocked"} (reported by the device)</p>
        )}

        <p className="text-xs text-muted">Simulated device. Changes go through the API and appear in the activity log.</p>

        <button
          type="button"
          onClick={() => onShowIn3d(device)}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-ink hover:bg-field-strong"
        >
          <Icon name="cube" size={16} />
          Show in 3D house
        </button>
        <button
          type="button"
          onClick={confirmDelete}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
        >
          <Icon name="trash" size={16} />
          Delete device
        </button>
      </aside>
    </div>
  );
}
