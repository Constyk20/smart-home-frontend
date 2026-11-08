import { ActivityPanel } from "../../components/ActivityPanel";
import { Icon } from "../../components/ui/Icon";
import { CARD, DeviceGrid, SectionTitle, type SectionProps } from "./shared";

const SECURITY_TYPES = ["door", "window", "security_camera"];

export function SecuritySection(props: SectionProps) {
  const { house } = props;
  const items = house.devices.filter((d) => SECURITY_TYPES.includes(d.device_type));
  const openings = items.filter((d) => d.device_type !== "security_camera");
  const open = openings.filter((d) => d.state?.is_open);
  const cameras = items.filter((d) => d.device_type === "security_camera");
  const camerasOn = cameras.filter((d) => d.state?.is_on).length;

  const ok = openings.length > 0 && open.length === 0;
  const headline =
    openings.length === 0
      ? "No doors or windows added yet"
      : open.length === 0
        ? "All doors and windows are closed"
        : `${open.length} open: ${open.map((d) => d.name).join(", ")}`;

  return (
    <div className="space-y-4">
      <section className={`${CARD} flex items-center gap-4 p-4`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
          <Icon name={ok ? "check" : "alert"} size={24} />
        </span>
        <div>
          <p className="font-semibold text-ink">{headline}</p>
          <p className="text-sm text-muted">
            {cameras.length === 0 ? "No cameras added." : `${camerasOn} of ${cameras.length} camera${cameras.length === 1 ? "" : "s"} on.`} Status comes from simulated
            devices. There are no real locks, sensors or alarms behind it.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle title="Doors, windows and cameras" />
        <DeviceGrid devices={items} props={props} empty="Add a door, window or security camera in Devices to see it here." />
      </section>

      <ActivityPanel houseId={props.houseId} refreshKey={house.activityVersion} />
    </div>
  );
}
