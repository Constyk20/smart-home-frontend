import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { DashboardSkeleton, SectionSkeleton } from "../components/dashboard/DashboardSkeleton";
import { Header } from "../components/dashboard/Header";
import type { Category } from "../components/dashboard/SmartHomeCard";
import { DeviceDrawer } from "../components/DeviceDrawer";
import type { SceneFocus } from "../components/HouseScene";
import { AppShell, SECTIONS, type SectionId } from "../components/shell/AppShell";
import { VoiceDock } from "../components/shell/VoiceDock";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useHouse } from "../hooks/useHouse";
import { useVoice } from "../hooks/useVoice";
import type { Device } from "../types";
import { AutomationsSection } from "./house/AutomationsSection";
import { DevicesSection } from "./house/DevicesSection";
import { EnergySection } from "./house/EnergySection";
import { OverviewSection } from "./house/OverviewSection";
import { RoomsSection } from "./house/RoomsSection";
import { SecuritySection } from "./house/SecuritySection";
import { SettingsSection } from "./house/SettingsSection";
import type { SectionProps } from "./house/shared";

function parseSection(value: string | null): SectionId {
  return SECTIONS.find((section) => section.id === value)?.id ?? "overview";
}

/** The section lives in `?section=` so each view can be bookmarked and the back button works. */
export function HousePage() {
  const { houseId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const section = parseSection(params.get("section"));
  const house = useHouse(houseId);
  const user = useCurrentUser();

  const [roomId, setRoomId] = useState("");
  const [focus, setFocus] = useState<SceneFocus | null>(null);
  const [openDeviceId, setOpenDeviceId] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voice = useVoice(house.devices, house.load);

  // Keep a valid room selected as rooms load, are added or are deleted.
  useEffect(() => {
    if (house.rooms.length > 0 && !house.rooms.some((room) => room.id === roomId)) setRoomId(house.rooms[0].id);
    if (house.rooms.length === 0 && roomId) setRoomId("");
  }, [house.rooms, roomId]);

  // Drop the focus if the device or room it points at is gone.
  useEffect(() => {
    if (!focus || !house.loaded) return;
    const exists =
      focus.type === "device" ? house.devices.some((d) => d.id === focus.id) : house.rooms.some((r) => r.id === focus.id);
    if (!exists) setFocus(null);
  }, [focus, house.devices, house.rooms, house.loaded]);

  const roomNames = useMemo(() => new Map(house.rooms.map((room) => [room.id, room.name])), [house.rooms]);

  // Devices that an enabled rule or schedule acts on (only when the API returns that detail).
  const automated = useMemo(() => {
    const ids = new Set<string>();
    for (const rule of house.rules) {
      if (!rule.enabled) continue;
      for (const action of rule.actions ?? []) if (action.device_id) ids.add(action.device_id);
    }
    for (const schedule of house.schedules) if (schedule.enabled && schedule.device_id) ids.add(schedule.device_id);
    return ids;
  }, [house.rules, house.schedules]);

  const navigate = useCallback(
    (next: SectionId) => setParams(next === "overview" ? {} : { section: next }),
    [setParams],
  );

  const showOverview = useCallback(() => {
    if (section !== "overview") setParams({});
  }, [section, setParams]);

  const focusDevice = useCallback(
    (device: Device) => {
      setRoomId(device.room_id);
      setFocus({ type: "device", id: device.id });
      setOpenDeviceId("");
      showOverview();
    },
    [showOverview],
  );

  const focusRoom = useCallback(
    (id: string) => {
      setRoomId(id);
      setFocus({ type: "room", id });
      showOverview();
    },
    [showOverview],
  );

  const resetFocus = useCallback(() => setFocus(null), []);

  // Escape returns to the full-house view (the device drawer and voice popover handle their own Escape).
  useEffect(() => {
    if (!focus || section !== "overview") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !openDeviceId && !voiceOpen) setFocus(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, section, openDeviceId, voiceOpen]);

  const openCategory = useCallback(
    (category: Category) => {
      if (category === "security" || category === "cameras") setParams({ section: "security" });
      else setParams({ section: "devices", group: category });
    },
    [setParams],
  );

  const openVoice = useCallback(() => setVoiceOpen(true), []);
  const closeDrawer = useCallback(() => setOpenDeviceId(""), []);
  const openDevice = house.devices.find((device) => device.id === openDeviceId);

  const attention = house.devices.filter((d) => (d.device_type === "door" || d.device_type === "window") && d.state?.is_open).length;

  const sectionProps: SectionProps = {
    houseId,
    house,
    roomId,
    onSelectRoom: setRoomId,
    onOpenDevice: (device) => setOpenDeviceId(device.id),
    focus,
    onFocusDevice: focusDevice,
    onFocusRoom: focusRoom,
    onResetFocus: resetFocus,
    onNavigate: navigate,
    onOpenCategory: openCategory,
    voice,
    onOpenVoice: openVoice,
    automated,
    roomNames,
  };

  return (
    <AppShell
      active={section}
      onNavigate={navigate}
      header={
        <Header
          userName={user?.name}
          houseName={house.houseName}
          connection={house.connection}
          indoorTemperature={house.simulation?.environment.temperature}
          attention={attention}
          onOpenAttention={() => navigate("security")}
          voice={
            <VoiceDock voice={voice} open={voiceOpen} onOpenChange={setVoiceOpen} />
          }
        />
      }
    >
      {house.error && (
        <p role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-danger-soft px-4 py-2 text-sm text-danger">
          <span>{house.error}</span>
          <button type="button" className="shrink-0 font-medium underline" onClick={() => house.setError("")}>
            Dismiss
          </button>
        </p>
      )}

      {!house.loaded && !house.error ? (
        section === "overview" ? <DashboardSkeleton /> : <SectionSkeleton />
      ) : (
        <>
          {section === "overview" && <OverviewSection {...sectionProps} />}
          {section === "rooms" && <RoomsSection {...sectionProps} />}
          {section === "devices" && <DevicesSection {...sectionProps} />}
          {section === "automations" && <AutomationsSection {...sectionProps} />}
          {section === "energy" && <EnergySection {...sectionProps} />}
          {section === "security" && <SecuritySection {...sectionProps} />}
          {section === "settings" && <SettingsSection {...sectionProps} />}
        </>
      )}

      {openDevice && (
        <DeviceDrawer
          device={openDevice}
          roomName={roomNames.get(openDevice.room_id) ?? "No room"}
          automated={automated.has(openDevice.id)}
          busy={house.pending.has(openDevice.id)}
          onToggle={(device) => void house.toggle(device)}
          onPatch={(device, partial) => house.patchState(device, partial)}
          onDelete={(device) => {
            closeDrawer();
            void house.removeDevice(device.id);
          }}
          onShowIn3d={focusDevice}
          onClose={closeDrawer}
        />
      )}
    </AppShell>
  );
}
