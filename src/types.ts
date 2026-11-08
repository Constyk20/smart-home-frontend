export type Room = { id: string; name: string; room_type: string };

export type DeviceState = {
  is_on?: boolean;
  is_open?: boolean;
  is_locked?: boolean;
  brightness?: number;
  target_temp?: number;
  speed?: number;
};

export type Device = { id: string; name: string; device_type: string; room_id: string; state: DeviceState };

export type Environment = { temperature: number; humidity: number; light_level: number };

export type Simulation = {
  environment: Environment;
  simulation: { is_running: boolean; speed: number; simulated_seconds: number };
};

export type EnergyDevice = {
  device_name: string;
  wattage: number;
  is_on: boolean;
  estimated_kwh_today: number;
  estimated_cost_today: number;
};

export type EnergySummary = {
  tariff_per_kwh: number;
  total_kwh_today: number;
  total_cost_today: number;
  devices: EnergyDevice[];
};

export type EnergyDay = { date: string; kwh: number; cost_naira: number };

export type Recommendation = {
  id: string;
  source: "rule" | "ml";
  title: string;
  reason: string;
  device_id?: string | null;
  suggested_state?: DeviceState | null;
  probability_on?: number | null;
};

/** Only the fields the dashboard reads. `actions` is optional because older rules may not return it. */
export type RuleSummary = {
  id: string;
  name: string;
  enabled: boolean;
  actions?: { device_id?: string }[];
};

export type ScheduleSummary = { id: string; name: string; enabled: boolean; device_id?: string };

export type Connection = "connecting" | "live" | "offline";
