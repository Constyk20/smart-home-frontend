import { useState, type SubmitEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { DEVICE_TYPES, humanize } from "../../lib/devices";
import { CARD, DeviceGrid, SectionTitle, type SectionProps } from "./shared";

const GROUPS: Record<string, { label: string; types: string[] }> = {
  lights: { label: "Lights", types: ["light"] },
  climate: { label: "Climate", types: ["air_conditioner"] },
  fans: { label: "Fans", types: ["fan", "exhaust_fan"] },
};

export function DevicesSection(props: SectionProps) {
  const [params, setParams] = useSearchParams();
  const group = GROUPS[params.get("group") ?? ""];
  const { house, roomId } = props;
  const [filter, setFilter] = useState("all");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("light");
  const [targetRoom, setTargetRoom] = useState("");

  const inRoom = filter === "all" ? house.devices : house.devices.filter((d) => d.room_id === filter);
  const visible = group ? inRoom.filter((d) => group.types.includes(d.device_type)) : inRoom;
  const addRoomId = targetRoom || roomId || house.rooms[0]?.id || "";

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addRoomId) {
      house.setError("Create a room first.");
      return;
    }
    await house.addDevice(name, type, addRoomId);
    setName("");
  }

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-ink text-white" : "bg-card text-ink-2 hover:bg-field-strong border border-line"}`;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle title="All devices" hint={`${house.devices.length} in this house`} />
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by room">
          <button type="button" className={chip(filter === "all")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All
          </button>
          {house.rooms.map((room) => (
            <button key={room.id} type="button" className={chip(filter === room.id)} aria-pressed={filter === room.id} onClick={() => setFilter(room.id)}>
              {room.name}
            </button>
          ))}
        </div>
        {group && (
          <p className="mb-3 text-sm text-ink-2">
            Showing {group.label.toLowerCase()} only.{" "}
            <button type="button" className="font-medium text-brand hover:text-brand-ink" onClick={() => setParams({ section: "devices" })}>
              Show all devices
            </button>
          </p>
        )}
        <DeviceGrid devices={visible} props={props} empty="No devices here yet." />
      </section>

      <section className={`${CARD} p-4`}>
        <SectionTitle title="Add a device" />
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-wrap gap-2">
          <input
            className="min-w-0 flex-1 basis-48 rounded-lg bg-field px-3 py-2 text-sm"
            placeholder="Device name"
            aria-label="Device name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <select className="rounded-lg bg-field px-3 py-2 text-sm" aria-label="Device type" value={type} onChange={(event) => setType(event.target.value)}>
            {DEVICE_TYPES.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
          <select className="rounded-lg bg-field px-3 py-2 text-sm" aria-label="Room" value={addRoomId} onChange={(event) => setTargetRoom(event.target.value)}>
            {house.rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-ink">
            <Icon name="plus" size={16} />
            Add device
          </button>
        </form>
      </section>
    </div>
  );
}
