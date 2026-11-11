import { useState } from "react";
import { DevicePanel } from "../../components/dashboard/DevicePanel";
import { ActivityCard } from "../../components/dashboard/ActivityCard";
import { EnergyCard } from "../../components/dashboard/EnergyCard";
import { HomeAiCard } from "../../components/dashboard/HomeAiCard";
import { RoomStrip } from "../../components/dashboard/RoomStrip";
import { SmartHomeCard } from "../../components/dashboard/SmartHomeCard";
import { HouseScene } from "../../components/HouseScene";
import { Skeleton } from "../../components/ui/Skeleton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import type { SectionProps } from "./shared";

/**
 * Three areas around the existing 3D house: Smart Home and Energy on the left,
 * the house in the middle, Home AI (or the focused device) and Activity on the right.
 * Below 1024px the cards stack and the device panel moves up under the house.
 */
export function OverviewSection(props: SectionProps) {
  const { house, houseId, roomId, focus, roomNames } = props;
  const { devices, rooms, simulation, energy, history } = house;
  const [sceneReady, setSceneReady] = useState(false);
  const wide = useMediaQuery("(min-width: 1024px)");

  const focused = focus?.type === "device" ? devices.find((device) => device.id === focus.id) : undefined;
  const panel = focused ? (
    <DevicePanel
      device={focused}
      roomName={roomNames.get(focused.room_id) ?? "No room"}
      siblings={devices.filter((device) => device.room_id === focused.room_id)}
      automated={props.automated.has(focused.id)}
      busy={house.pending.has(focused.id)}
      onToggle={(device) => void house.toggle(device)}
      onPatch={(device, partial) => house.patchState(device, partial)}
      onFocusDevice={props.onFocusDevice}
      onReset={props.onResetFocus}
    />
  ) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[17.5rem_minmax(0,1fr)_19rem] xl:grid-cols-[19.5rem_minmax(0,1fr)_21rem]">
      {/* Left */}
      <div className="order-2 space-y-4 lg:order-1">
        <SmartHomeCard devices={devices} simulation={simulation} onOpen={props.onOpenCategory} />
        <EnergyCard energy={energy} history={history} onOpen={() => props.onNavigate("energy")} />
      </div>

      {/* Centre: the existing house, then the room and device strip */}
      <div className="order-1 min-w-0 space-y-3 md:col-span-2 lg:order-2 lg:col-span-1">
        <div className="relative h-[22rem] overflow-hidden rounded-xl border border-line bg-[#e4ebf7] shadow-sm sm:h-[28rem] md:h-[32rem] lg:h-[calc(100vh-18rem)] lg:max-h-[52rem] lg:min-h-[32rem]">
          <HouseScene
            rooms={rooms}
            devices={devices}
            selectedRoomId={roomId}
            onSelectRoom={props.onFocusRoom}
            temperature={simulation?.environment.temperature}
            onToggle={(device) => {
              const match = devices.find((item) => item.id === device.id);
              if (match) void house.toggle(match);
            }}
            onSelectDevice={(device) => {
              const match = devices.find((item) => item.id === device.id);
              if (match) props.onFocusDevice(match);
            }}
            focus={focus}
            onReady={() => setSceneReady(true)}
          />
          {!sceneReady && rooms.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#e4ebf7]" role="status" aria-label="Loading the 3D house">
              <Skeleton className="h-3/5 w-4/5 rounded-2xl" />
            </div>
          )}
        </div>
        <RoomStrip
          rooms={rooms}
          devices={devices}
          roomId={roomId}
          focus={focus}
          onFocusRoom={props.onFocusRoom}
          onFocusDevice={props.onFocusDevice}
          onReset={props.onResetFocus}
        />
        {!wide && panel}
      </div>

      {/* Right */}
      <div className="order-3 space-y-4">
        {wide && panel}
        {(!wide || !panel) && (
          <HomeAiCard
            houseId={houseId}
            refreshKey={house.activityVersion}
            voice={props.voice}
            onOpenVoice={props.onOpenVoice}
            onOpenDetails={() => props.onNavigate("automations")}
          />
        )}
        <ActivityCard houseId={houseId} refreshKey={house.activityVersion} onOpenAll={() => props.onNavigate("automations")} />
      </div>
    </div>
  );
}
