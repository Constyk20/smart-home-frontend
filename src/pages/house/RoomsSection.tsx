import { useState, type SubmitEvent } from "react";
import { Icon, roomIcon } from "../../components/ui/Icon";
import { ROOM_TYPES, humanize, isActive } from "../../lib/devices";
import { CARD, DeviceGrid, SectionTitle, type SectionProps } from "./shared";

export function RoomsSection(props: SectionProps) {
  const { house, roomId, onSelectRoom } = props;
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("living_room");
  const selected = house.rooms.find((room) => room.id === roomId);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await house.addRoom(name, type);
    setName("");
  }

  function confirmDelete() {
    if (!selected) return;
    if (window.confirm(`Delete ${selected.name}? Its devices may be removed too.`)) void house.removeRoom(selected.id);
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title="Rooms" hint="Choose a room to see and control its devices." />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {house.rooms.map((room) => {
            const inRoom = house.devices.filter((d) => d.room_id === room.id);
            const on = inRoom.filter(isActive).length;
            const current = room.id === roomId;
            return (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => onSelectRoom(room.id)}
                  aria-pressed={current}
                  className={`${CARD} flex w-full items-center gap-3 p-4 text-left transition hover:shadow-md ${current ? "border-brand ring-2 ring-brand/20" : ""}`}
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${current ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                    <Icon name={roomIcon(room.room_type)} size={24} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{room.name}</span>
                    <span className="block text-xs text-muted">
                      {humanize(room.room_type)} · {inRoom.length} device{inRoom.length === 1 ? "" : "s"} · {on} on
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {house.rooms.length === 0 && <li className={`${CARD} px-4 py-6 text-sm text-muted`}>No rooms yet. Add the first one below.</li>}
        </ul>
      </section>

      {selected && (
        <section>
          <SectionTitle
            title={`Devices in ${selected.name}`}
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => props.onFocusRoom(selected.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-field-strong"
                >
                  <Icon name="cube" size={14} />
                  View in 3D
                </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-soft"
              >
                <Icon name="trash" size={14} />
                Delete room
              </button>
              </div>
            }
          />
          <DeviceGrid devices={house.devices.filter((d) => d.room_id === selected.id)} props={props} empty="No devices in this room yet." />
        </section>
      )}

      <section className={`${CARD} p-4`}>
        <SectionTitle title="Add a room" />
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 basis-48 rounded-lg bg-field px-3 py-2 text-sm"
            placeholder="Room name"
            aria-label="Room name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <select className="rounded-lg bg-field px-3 py-2 text-sm" aria-label="Room type" value={type} onChange={(event) => setType(event.target.value)}>
            {ROOM_TYPES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-ink">
            <Icon name="plus" size={16} />
            Add room
          </button>
        </form>
      </section>
    </div>
  );
}
