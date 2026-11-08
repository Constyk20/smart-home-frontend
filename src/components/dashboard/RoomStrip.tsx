import { Icon, deviceIcon, roomIcon } from "../ui/Icon";
import { isActive } from "../../lib/devices";
import type { SceneFocus } from "../HouseScene";
import type { Device, Room } from "../../types";

type Props = {
  rooms: Room[];
  devices: Device[];
  roomId: string;
  focus: SceneFocus | null;
  onFocusRoom: (roomId: string) => void;
  onFocusDevice: (device: Device) => void;
  onReset: () => void;
};

/** Sits under the house (never over it): pick a room, then pick one of its devices. */
export function RoomStrip({ rooms, devices, roomId, focus, onFocusRoom, onFocusDevice, onReset }: Props) {
  const inRoom = devices.filter((device) => device.room_id === roomId);
  const pill = (selected: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      selected ? "bg-ink text-white" : "bg-field text-ink-2 hover:bg-field-strong"
    }`;

  return (
    <section className="rounded-xl border border-line bg-card p-3 shadow-sm" aria-label="Rooms and devices">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="group" aria-label="Rooms">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              aria-pressed={room.id === roomId}
              onClick={() => onFocusRoom(room.id)}
              className={pill(room.id === roomId)}
            >
              <Icon name={roomIcon(room.room_type)} size={14} />
              {room.name}
            </button>
          ))}
        </div>
        {focus && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft"
          >
            <Icon name="back" size={14} />
            Full house
          </button>
        )}
      </div>

      {inRoom.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Devices in the selected room">
          {inRoom.map((device) => {
            const selected = focus?.type === "device" && focus.id === device.id;
            return (
              <button
                key={device.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onFocusDevice(device)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  selected ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card text-ink-2 hover:bg-field"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isActive(device) ? "bg-brand" : "bg-faint/50"}`} />
                <Icon name={deviceIcon(device.device_type)} size={14} />
                {device.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">No devices in this room yet. Add one in Devices.</p>
      )}
    </section>
  );
}
