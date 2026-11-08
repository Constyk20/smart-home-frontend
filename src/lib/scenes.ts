import type { Device, DeviceState, Room } from "../types";
import { isOpening } from "./devices";

export type SceneChange = { device: Device; state: DeviceState };

export type Scene = {
  id: string;
  name: string;
  description: string;
  icon: "bulb" | "shield" | "moon" | "sofa";
  plan: (devices: Device[], rooms: Room[]) => SceneChange[];
};

/** Only keep a change when it would actually alter the device. */
function change(device: Device, partial: DeviceState): SceneChange | null {
  const differs = (Object.keys(partial) as (keyof DeviceState)[]).some((key) => device.state?.[key] !== partial[key]);
  return differs ? { device, state: { ...device.state, ...partial } } : null;
}

function compact(items: (SceneChange | null)[]): SceneChange[] {
  return items.filter((item): item is SceneChange => item !== null);
}

/**
 * Scenes are plain lists of device-state updates sent through the normal device API,
 * so they appear in the activity log exactly like manual changes.
 */
export const SCENES: Scene[] = [
  {
    id: "all-lights-off",
    name: "All lights off",
    description: "Switches off every light that is on.",
    icon: "bulb",
    plan: (devices) => compact(devices.filter((d) => d.device_type === "light").map((d) => change(d, { is_on: false }))),
  },
  {
    id: "away",
    name: "Away mode",
    description: "Powers everything down, closes doors and windows, keeps cameras on.",
    icon: "shield",
    plan: (devices) =>
      compact(
        devices.map((d) => {
          if (d.device_type === "security_camera") return change(d, { is_on: true });
          if (d.device_type === "door" || d.device_type === "window") return change(d, { is_open: false });
          if (isOpening(d.device_type)) return null;
          return change(d, { is_on: false });
        }),
      ),
  },
  {
    id: "night",
    name: "Night mode",
    description: "Lights and TV off, curtains, doors and windows closed.",
    icon: "moon",
    plan: (devices) =>
      compact(
        devices.map((d) => {
          if (d.device_type === "light" || d.device_type === "television") return change(d, { is_on: false });
          if (isOpening(d.device_type)) return change(d, { is_open: false });
          return null;
        }),
      ),
  },
  {
    id: "relax",
    name: "Relax mode",
    description: "Living room and bedroom lights on at 40% brightness.",
    icon: "sofa",
    plan: (devices, rooms) => {
      const cosy = new Set(rooms.filter((r) => r.room_type === "living_room" || r.room_type === "bedroom").map((r) => r.id));
      return compact(
        devices
          .filter((d) => d.device_type === "light" && cosy.has(d.room_id))
          .map((d) => change(d, { is_on: true, brightness: 40 })),
      );
    },
  },
];
