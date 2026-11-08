import { useEffect, useState, type SubmitEvent } from "react";
import { api } from "../api";
import { SkeletonRow } from "./ui/Skeleton";

type Item = { id: string; name: string; time: string; enabled: boolean };
type DeviceOption = { id: string; name: string; device_type: string };
type Props = { houseId: string; devices: DeviceOption[] };

export function SchedulePanel({ houseId, devices }: Props) {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Evening light");
  const [time, setTime] = useState("19:00");
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [turnOn, setTurnOn] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get<Item[]>(`/houses/${houseId}/schedules`);
    setRows(response.data);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {
      setMessage("Could not load schedules.");
      setLoading(false);
    });
  }, [houseId]);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const device = devices.find((item) => item.id === deviceId);
    const opens = device && ["door", "window", "curtain"].includes(device.device_type);
    await api.post(`/houses/${houseId}/schedules`, {
      name,
      device_id: deviceId,
      time,
      days: [0, 1, 2, 3, 4, 5, 6],
      state: opens ? { is_open: turnOn } : { is_on: turnOn },
      enabled: true,
    });
    setMessage("Schedule saved. It runs once when the Lagos clock matches.");
    await load();
  }

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 shadow-sm text-sm">
      <h2 className="text-base font-semibold">Schedules</h2>
      <p className="mt-1 text-muted">Clock time in Africa/Lagos. Not a temperature rule and not a model.</p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-wrap gap-2">
        <input className="rounded-lg bg-field px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="rounded-lg bg-field px-3 py-2" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        <select className="rounded-lg bg-field px-3" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
          {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
        </select>
        <select className="rounded-lg bg-field px-3" value={turnOn ? "on" : "off"} onChange={(e) => setTurnOn(e.target.value === "on")}>
          <option value="on">on / open</option>
          <option value="off">off / closed</option>
        </select>
        <button className="rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3" type="submit">Save</button>
      </form>
      {message && <p className="mt-2">{message}</p>}
      <ul className="mt-3 space-y-1">
        {loading && (
          <li role="status" aria-label="Loading schedules">
            <SkeletonRow />
          </li>
        )}
        {!loading && rows.map((row) => <li key={row.id}>{row.name} at {row.time}</li>)}
        {!loading && rows.length === 0 && <li className="text-muted">No schedules.</li>}
      </ul>
    </section>
  );
}
