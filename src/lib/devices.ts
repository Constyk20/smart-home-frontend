import type { Device } from "../types";

export const ROOM_TYPES = ["living_room", "bedroom", "kitchen", "bathroom", "entrance", "outdoor", "other"] as const;

export const DEVICE_TYPES = [
  "light",
  "fan",
  "air_conditioner",
  "television",
  "door",
  "window",
  "curtain",
  "exhaust_fan",
  "security_camera",
] as const;

export function isOpening(deviceType: string): boolean {
  return deviceType === "door" || deviceType === "window" || deviceType === "curtain";
}

export function isActive(device: Pick<Device, "device_type" | "state">): boolean {
  return isOpening(device.device_type) ? Boolean(device.state?.is_open) : Boolean(device.state?.is_on);
}

export function statusLabel(device: Pick<Device, "device_type" | "state">): string {
  if (isOpening(device.device_type)) return device.state?.is_open ? "Open" : "Closed";
  return device.state?.is_on ? "On" : "Off";
}

/** "air_conditioner" -> "Air conditioner" */
export function humanize(value: string): string {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function hasControls(deviceType: string): boolean {
  return deviceType === "light" || deviceType === "air_conditioner";
}
