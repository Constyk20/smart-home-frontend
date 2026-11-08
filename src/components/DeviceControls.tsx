import { Slider } from "./ui/Slider";
import type { Device, DeviceState } from "../types";

type Props = {
  device: Device;
  disabled?: boolean;
  onPatch: (device: Device, partial: DeviceState) => Promise<void> | void;
};

/** Settings that exist for this device type. Types with no settings render nothing. */
export function DeviceControls({ device, disabled, onPatch }: Props) {
  if (device.device_type === "light") {
    return (
      <Slider
        label="Brightness"
        value={device.state?.brightness ?? 100}
        min={1}
        max={100}
        unit="%"
        disabled={disabled}
        onCommit={(brightness) => onPatch(device, { brightness, is_on: true })}
      />
    );
  }

  if (device.device_type === "air_conditioner") {
    return (
      <Slider
        label="Target temperature"
        value={device.state?.target_temp ?? 24}
        min={16}
        max={30}
        unit="°C"
        disabled={disabled}
        onCommit={(target_temp) => onPatch(device, { target_temp })}
      />
    );
  }

  return null;
}
