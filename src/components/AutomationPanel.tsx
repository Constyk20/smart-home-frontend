import { useEffect, useState, type SubmitEvent } from "react";
import { api } from "../api";
import { SkeletonRow } from "./ui/Skeleton";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  cooldown_seconds: number;
};

type DeviceOption = { id: string; name: string };

type HistoryEntry = {
  id: string;
  rule_name: string;
  executed_at: string;
  actions_applied: number;
  changes: { device_name?: string; new_state?: Record<string, unknown> }[];
};

type Props = { houseId: string; devices: DeviceOption[]; refreshKey?: number };

function describeChange(change: HistoryEntry["changes"][number]) {
  const state = Object.entries(change.new_state ?? {})
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
  return `${change.device_name ?? "Device"} → ${state}`;
}

export function AutomationPanel({ houseId, devices, refreshKey = 0 }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [name, setName] = useState("Turn a device off when it is warm");
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [turnOn, setTurnOn] = useState(false);
  const [temperature, setTemperature] = useState(28);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get<Rule[]>(`/houses/${houseId}/automation/rules`);
    setRules(response.data);
    setRulesLoading(false);
  }

  async function loadHistory() {
    try {
      const response = await api.get<HistoryEntry[]>(`/houses/${houseId}/automation/history?limit=10`);
      setHistory(response.data);
      setHistoryError("");
    } catch {
      setHistoryError("Could not load execution history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {
      setMessage("Could not load rules.");
      setRulesLoading(false);
    });
  }, [houseId]);

  useEffect(() => {
    void loadHistory();
  }, [houseId, refreshKey]);

  useEffect(() => {
    if (!deviceId && devices[0]) setDeviceId(devices[0].id);
  }, [devices, deviceId]);

  async function createRule(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    await api.post(`/houses/${houseId}/automation/rules`, {
      name,
      enabled: true,
      priority: 10,
      cooldown_seconds: 30,
      conditions: [{ type: "environment", field: "temperature", operator: "gte", value: temperature }],
      actions: [{ type: "set_device_state", device_id: deviceId, state: { is_on: turnOn } }],
    });
    setMessage("Rule saved.");
    await load();
  }

  async function removeRule(ruleId: string) {
    await api.delete(`/automation/rules/${ruleId}`);
    await load();
  }

  async function evaluate() {
    const response = await api.post(`/houses/${houseId}/automation/evaluate`);
    setMessage(`Evaluated ${response.data.results.length} rule(s).`);
    await load();
    await loadHistory();
  }

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 shadow-sm text-sm">
      <h2 className="text-base font-semibold">Automation rules</h2>
      <p className="mt-1 text-muted">
        Deterministic rules. The worker also runs them after each simulation tick. This is not machine learning.
      </p>
      <form onSubmit={createRule} className="mt-3 space-y-2">
        <input className="w-full rounded-lg bg-field px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="block text-muted">
          When temperature is at least
          <input className="ml-2 w-20 rounded-lg bg-field px-2 py-1" type="number" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          °C
        </label>
        <label className="block text-muted">
          Set
          <select className="mx-2 rounded-lg bg-field px-2 py-1" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select>
          <select className="rounded-lg bg-field px-2 py-1" value={turnOn ? "on" : "off"} onChange={(e) => setTurnOn(e.target.value === "on")}>
            <option value="off">off</option>
            <option value="on">on</option>
          </select>
        </label>
        <button className="rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-1" type="submit">Save rule</button>
      </form>
      <button className="mt-3 rounded-lg bg-field-strong text-ink hover:bg-line px-3 py-1" onClick={() => evaluate().catch(() => setMessage("Evaluation failed."))}>
        Evaluate now
      </button>
      {message && <p className="mt-2 text-ink-2">{message}</p>}
      <ul className="mt-3 space-y-2">
        {rulesLoading && (
          <li role="status" aria-label="Loading rules">
            <SkeletonRow />
          </li>
        )}
        {!rulesLoading && rules.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between">
            <span>{rule.name} · priority {rule.priority} · {rule.enabled ? "enabled" : "disabled"}</span>
            <button className="text-danger" onClick={() => removeRule(rule.id).catch(() => setMessage("Delete failed."))}>Delete</button>
          </li>
        ))}
        {!rulesLoading && rules.length === 0 && <li className="text-muted">No rules yet.</li>}
      </ul>
      <h3 className="mt-4 font-medium">Recent executions</h3>
      <p className="text-xs text-muted">Each time a rule fired and changed a device.</p>
      {historyError && <p className="mt-1 text-danger">{historyError}</p>}
      <ul className="mt-2 space-y-2">
        {historyLoading && (
          <li role="status" aria-label="Loading history">
            <SkeletonRow />
          </li>
        )}
        {!historyLoading && history.map((entry) => (
          <li key={entry.id}>
            <p>{entry.rule_name}</p>
            <p className="text-xs text-muted">
              {new Date(entry.executed_at).toLocaleString()} · {entry.changes.map(describeChange).join("; ")}
            </p>
          </li>
        ))}
        {!historyLoading && history.length === 0 && !historyError && <li className="text-muted">No rule has fired yet.</li>}
      </ul>
    </section>
  );
}
