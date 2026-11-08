import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, type House } from "../api";
import { isOpening } from "../lib/devices";
import type {
  Connection,
  Device,
  DeviceState,
  EnergyDay,
  EnergySummary,
  Recommendation,
  Room,
  RuleSummary,
  ScheduleSummary,
  Simulation,
} from "../types";
import type { SceneChange } from "../lib/scenes";

type SocketEvent = {
  event: string;
  data: {
    device_id?: string;
    state?: DeviceState;
    temperature?: number;
    humidity?: number;
    light_level?: number;
    simulated_seconds?: number;
  };
};

/**
 * All server state for one house plus the actions that change it.
 * The backend stays the authority: every action sends the request, then reloads.
 * Actions never throw; failures are put in `error`.
 */
export function useHouse(houseId: string) {
  const [houseName, setHouseName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [energy, setEnergy] = useState<EnergySummary | null>(null);
  const [advice, setAdvice] = useState<Recommendation[]>([]);
  const [history, setHistory] = useState<EnergyDay[]>([]);
  const [rules, setRules] = useState<RuleSummary[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [activityVersion, setActivityVersion] = useState(0);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const loadRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(async () => {
    const [roomRes, deviceRes, simRes, energyRes, adviceRes, historyRes, ruleRes, scheduleRes] = await Promise.all([
      api.get<Room[]>(`/houses/${houseId}/rooms`),
      api.get<Device[]>(`/houses/${houseId}/devices`),
      api.get<Simulation>(`/houses/${houseId}/simulation`),
      api.get<EnergySummary>(`/houses/${houseId}/energy`),
      api.get<Recommendation[]>(`/houses/${houseId}/recommendations`),
      api.get<{ days: EnergyDay[] }>(`/houses/${houseId}/energy/history?days=7`),
      api.get<RuleSummary[]>(`/houses/${houseId}/automation/rules`),
      api.get<ScheduleSummary[]>(`/houses/${houseId}/schedules`),
    ]);
    setRooms(roomRes.data);
    setDevices(deviceRes.data);
    setSimulation(simRes.data);
    setEnergy(energyRes.data);
    setAdvice(adviceRes.data);
    setHistory(historyRes.data.days);
    setRules(ruleRes.data);
    setSchedules(scheduleRes.data);
    setLoaded(true);
    setActivityVersion((version) => version + 1);
  }, [houseId]);

  loadRef.current = load;

  useEffect(() => {
    load()
      .then(() => setError(""))
      .catch(() => setError("Could not load this house. Check that the API is running and you own it."));
  }, [load]);

  useEffect(() => {
    api
      .get<House[]>("/houses")
      .then((res) => setHouseName(res.data.find((house) => house.id === houseId)?.name ?? ""))
      .catch(() => undefined);
  }, [houseId]);

  // Simulation clock refresh, same 5 second cadence as before.
  useEffect(() => {
    const timer = setInterval(() => {
      api
        .get<Simulation>(`/houses/${houseId}/simulation`)
        .then((res) => setSimulation(res.data))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [houseId]);

  // Live updates over the WebSocket.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !houseId) return;

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/houses/${houseId}?token=${encodeURIComponent(token)}`);
    socket.onopen = () => setConnection("live");
    socket.onclose = () => setConnection("offline");
    socket.onerror = () => setConnection("offline");

    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as SocketEvent;

      if (event.event === "device_state_changed" && event.data.device_id && event.data.state) {
        const deviceId = event.data.device_id;
        const state = event.data.state;
        setDevices((current) => current.map((device) => (device.id === deviceId ? { ...device, state } : device)));
        return;
      }

      if (event.event === "simulation_ticked") {
        setSimulation((current) =>
          current
            ? {
                ...current,
                environment: {
                  ...current.environment,
                  temperature: event.data.temperature ?? current.environment.temperature,
                  humidity: event.data.humidity ?? current.environment.humidity,
                  light_level: event.data.light_level ?? current.environment.light_level,
                },
                simulation: {
                  ...current.simulation,
                  simulated_seconds: event.data.simulated_seconds ?? current.simulation.simulated_seconds,
                },
              }
            : current,
        );
        return;
      }

      if (event.event === "automation_applied") {
        loadRef.current().catch(() => undefined);
      }
    };

    return () => socket.close();
  }, [houseId]);

  /** Runs one action, reloads, and turns any failure into a visible message. */
  const guard = useCallback(
    async (fallback: string, work: () => Promise<void>, busyId?: string) => {
      setError("");
      if (busyId) setPending((current) => new Set(current).add(busyId));
      try {
        await work();
        await loadRef.current();
      } catch (failure) {
        setError(errorMessage(failure, fallback));
      } finally {
        if (busyId) {
          setPending((current) => {
            const next = new Set(current);
            next.delete(busyId);
            return next;
          });
        }
      }
    },
    [],
  );

  const patchState = useCallback(
    (device: Device, partial: DeviceState, fallback = "State update failed.") =>
      guard(
        fallback,
        async () => {
          await api.put(`/devices/${device.id}/state`, { state: { ...device.state, ...partial } });
        },
        device.id,
      ),
    [guard],
  );

  const toggle = useCallback(
    (device: Device) =>
      patchState(device, isOpening(device.device_type) ? { is_open: !device.state?.is_open } : { is_on: !device.state?.is_on }),
    [patchState],
  );

  const addRoom = useCallback(
    (name: string, roomType: string) =>
      guard("Could not add the room.", async () => {
        await api.post(`/houses/${houseId}/rooms`, { name, room_type: roomType });
      }),
    [guard, houseId],
  );

  const removeRoom = useCallback(
    (id: string) =>
      guard("Could not delete the room.", async () => {
        await api.delete(`/rooms/${id}`);
      }),
    [guard],
  );

  const addDevice = useCallback(
    (name: string, deviceType: string, roomId: string) =>
      guard("Could not add the device.", async () => {
        await api.post("/devices", { name, device_type: deviceType, room_id: roomId });
      }),
    [guard],
  );

  const removeDevice = useCallback(
    (id: string) =>
      guard("Could not delete the device.", async () => {
        await api.delete(`/devices/${id}`);
      }),
    [guard],
  );

  const controlSimulation = useCallback(
    (action: "start" | "pause") =>
      guard(action === "start" ? "Could not start the simulation." : "Could not pause the simulation.", async () => {
        await api.post(`/houses/${houseId}/simulation/control`, { action, speed: action === "start" ? 60 : undefined });
      }),
    [guard, houseId],
  );

  const acceptSuggestion = useCallback(
    (item: Recommendation) =>
      guard("Could not apply the suggestion.", async () => {
        await api.post(`/houses/${houseId}/recommendations/feedback`, { recommendation_id: item.id, accepted: true });
        if (item.device_id && item.suggested_state) {
          const device = devices.find((entry) => entry.id === item.device_id);
          if (!device) {
            setError("That device is no longer in this house.");
            return;
          }
          await api.put(`/devices/${item.device_id}/state`, { state: { ...device.state, ...item.suggested_state } });
        }
      }),
    [guard, houseId, devices],
  );

  /** Sends every change of a scene, then reloads once. Returns how many devices succeeded. */
  const applyChanges = useCallback(
    async (changes: SceneChange[]): Promise<number> => {
      setError("");
      const results = await Promise.allSettled(
        changes.map(({ device, state }) => api.put(`/devices/${device.id}/state`, { state })),
      );
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed > 0) setError(`${failed} of ${changes.length} device changes failed.`);
      try {
        await loadRef.current();
      } catch {
        setError("Changes were sent, but the house could not be reloaded.");
      }
      return changes.length - failed;
    },
    [],
  );

  return {
    houseName,
    rooms,
    devices,
    simulation,
    energy,
    advice,
    history,
    rules,
    schedules,
    error,
    setError,
    loaded,
    connection,
    activityVersion,
    pending,
    load,
    toggle,
    patchState,
    addRoom,
    removeRoom,
    addDevice,
    removeDevice,
    controlSimulation,
    acceptSuggestion,
    applyChanges,
  };
}

export type HouseData = ReturnType<typeof useHouse>;
