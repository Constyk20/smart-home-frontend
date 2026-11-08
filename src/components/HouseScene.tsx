import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { DoubleSide, MathUtils, Vector3, type Group, type MeshBasicMaterial, type Object3D, type OrthographicCamera } from "three";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SceneRoom = { id: string; name: string; room_type: string };

export type SceneDevice = {
  id: string;
  name: string;
  device_type: string;
  room_id: string;
  state: {
    is_on?: boolean;
    is_open?: boolean;
    is_locked?: boolean;
    brightness?: number;
    speed?: number;
    target_temp?: number;
  };
};

type Props = {
  rooms: SceneRoom[];
  devices: SceneDevice[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  temperature?: number;
  onToggle: (device: SceneDevice) => void;
  /**
   * Optional. When given, clicking a device (or its pin) calls this instead of `onToggle`,
   * so the page can focus the device and show its controls.
   */
  onSelectDevice?: (device: SceneDevice) => void;
  /** Optional. Moves the camera to a room or a device; null returns to the full-house view. */
  focus?: SceneFocus | null;
  /** Optional. Called once the WebGL canvas is ready, so a page can hide its loading skeleton. */
  onReady?: () => void;
};

export type SceneFocus = { type: "room" | "device"; id: string };

type V3 = [number, number, number];
type Toggle = (device: SceneDevice) => void;

// Pins are only shown for the selected room so the scene stays readable.
const PinsVisible = createContext(true);

// drei's Html appends its overlay to a container and removes it again on unmount. The default container
// (the Canvas wrapper) is already torn down by then, which throws. Giving every Html a container we own avoids it.
// The container ignores pointer events so the scene can still be dragged, which Html children inherit,
// so every clickable overlay button must opt back in with `pointer-events-auto`.
const HtmlPortal = createContext<RefObject<HTMLElement> | null>(null);

// Where each device pin and room sits in the scene, so the camera can fly to it without hardcoded positions.
type FocusContextValue = { anchors: Map<string, Object3D>; focusedDeviceId: string; selectMode: boolean };
const FocusContext = createContext<FocusContextValue>({ anchors: new Map(), focusedDeviceId: "", selectMode: false });

/* -------------------------------------------------------------------------- */
/*  Layout constants. Every room is a 4 x 4 module on a grid.                  */
/* -------------------------------------------------------------------------- */

const ROOM = 4;
const HALF = ROOM / 2;
const WALL_H = 2.6;
const WALL_T = 0.12;
const DOOR_W = 1.1;
const DOOR_H = 2.05;
const MAX_ROOMS = 6;

const GLASS = "#c7ddff";
const WALL_CAP = "#60a5fa";
const BORDER = "#cbd5e1";

const FLOORS: Record<string, string> = {
  living_room: "#d9c7a8",
  bedroom: "#cfc2b6",
  kitchen: "#e5e7eb",
  bathroom: "#cfe8ef",
  entrance: "#cbd5e1",
  outdoor: "#86c58a",
  other: "#dde3ea",
};

// Rooms are placed in this order so a typical house comes out the same way however it was created.
const ROOM_ORDER = ["living_room", "kitchen", "bedroom", "bathroom", "entrance", "outdoor", "other"];

function isOpening(deviceType: string) {
  return deviceType === "door" || deviceType === "window" || deviceType === "curtain";
}

function isActive(device: SceneDevice) {
  return isOpening(device.device_type) ? Boolean(device.state?.is_open) : Boolean(device.state?.is_on);
}

function stateWord(device: SceneDevice) {
  if (isOpening(device.device_type)) return device.state?.is_open ? "open" : "closed";
  return device.state?.is_on ? "on" : "off";
}

function clickable(device: SceneDevice, onToggle: Toggle) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onToggle(device);
  };
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function Block({
  size,
  position,
  color,
  rotation,
  radius = 0.04,
  roughness = 0.75,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  opacity = 1,
  cast = true,
  onClick,
}: {
  size: V3;
  position: V3;
  color: string;
  rotation?: V3;
  radius?: number;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  cast?: boolean;
  onClick?: (event: { stopPropagation: () => void }) => void;
}) {
  const safeRadius = Math.max(0.001, Math.min(radius, Math.min(...size) / 2 - 0.002));
  return (
    <RoundedBox
      args={size}
      radius={safeRadius}
      smoothness={3}
      position={position}
      rotation={rotation}
      castShadow={cast}
      receiveShadow
      onClick={onClick}
    >
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </RoundedBox>
  );
}

function Cylinder({
  position,
  radius,
  height,
  color,
  rotation,
  segments = 20,
  roughness = 0.8,
}: {
  position: V3;
  radius: number;
  height: number;
  color: string;
  rotation?: V3;
  segments?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Plant({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.34, 18]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.6} />
      </mesh>
      {(
        [
          [0, 0.62, 0, 0.3],
          [0.17, 0.5, 0.08, 0.2],
          [-0.15, 0.55, -0.08, 0.22],
          [0.02, 0.88, 0.04, 0.2],
        ] as [number, number, number, number][]
      ).map(([x, y, z, r], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 16, 14]} />
          <meshStandardMaterial color={index % 2 ? "#4f9d5d" : "#3f8a4f"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder position={[0, 0.5, 0]} radius={0.09} height={1} color="#8b6b4a" />
      {(
        [
          [0, 1.35, 0, 0.55],
          [0.3, 1.1, 0.15, 0.38],
          [-0.28, 1.15, -0.1, 0.4],
        ] as [number, number, number, number][]
      ).map(([x, y, z, r], index) => (
        <mesh key={index} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 18, 16]} />
          <meshStandardMaterial color={index === 0 ? "#3f8a4f" : "#4f9d5d"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Walls and floor                                                            */
/* -------------------------------------------------------------------------- */

function Wall({ axis, gap, interior }: { axis: "x" | "z"; gap: boolean; interior: boolean }) {
  const side = (ROOM - DOOR_W) / 2;
  const pieces = gap
    ? [
        { c: -(ROOM + DOOR_W) / 4, len: side, y0: 0, h: WALL_H },
        { c: (ROOM + DOOR_W) / 4, len: side, y0: 0, h: WALL_H },
        { c: 0, len: DOOR_W, y0: DOOR_H, h: WALL_H - DOOR_H },
      ]
    : [{ c: 0, len: ROOM, y0: 0, h: WALL_H }];

  return (
    <group position={axis === "z" ? [-HALF, 0, 0] : [0, 0, -HALF]}>
      {pieces.map((piece, index) => {
        const size: V3 = axis === "z" ? [WALL_T, piece.h, piece.len] : [piece.len, piece.h, WALL_T];
        const position: V3 =
          axis === "z" ? [0, piece.y0 + piece.h / 2, piece.c] : [piece.c, piece.y0 + piece.h / 2, 0];
        return (
          <group key={index} position={position}>
            <mesh renderOrder={2}>
              <boxGeometry args={size} />
              <meshPhysicalMaterial
                color={GLASS}
                transparent
                opacity={interior ? 0.14 : 0.34}
                roughness={0.15}
                depthWrite={false}
                side={DoubleSide}
              />
            </mesh>
            <mesh position={[0, piece.h / 2 + 0.03, 0]} castShadow>
              <boxGeometry args={[size[0] + 0.03, 0.07, size[2] + 0.03]} />
              <meshStandardMaterial color={WALL_CAP} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Furniture, one set per room type                                           */
/* -------------------------------------------------------------------------- */

function LivingRoomFurniture() {
  return (
    <>
      <Block size={[2.6, 0.02, 2.2]} position={[0.9, 0.011, 0.45]} color="#e8e4f0" radius={0.01} cast={false} />
      {/* sofa facing the TV wall */}
      <Block size={[2.1, 0.38, 0.85]} position={[0.9, 0.19, 1.0]} color="#7f9cc4" radius={0.08} />
      <Block size={[2.1, 0.55, 0.22]} position={[0.9, 0.62, 1.4]} color="#7893bb" radius={0.08} />
      <Block size={[0.22, 0.58, 0.85]} position={[-0.05, 0.3, 1.0]} color="#7893bb" radius={0.08} />
      <Block size={[0.22, 0.58, 0.85]} position={[1.85, 0.3, 1.0]} color="#7893bb" radius={0.08} />
      <Block size={[0.85, 0.14, 0.6]} position={[0.5, 0.45, 0.95]} color="#93aed3" radius={0.06} />
      <Block size={[0.85, 0.14, 0.6]} position={[1.3, 0.45, 0.95]} color="#93aed3" radius={0.06} />
      {/* coffee table */}
      <Block size={[1.0, 0.05, 0.55]} position={[0.9, 0.36, 0.0]} color="#a67c52" radius={0.02} />
      {(
        [
          [0.45, -0.2],
          [1.35, -0.2],
          [0.45, 0.2],
          [1.35, 0.2],
        ] as [number, number][]
      ).map(([x, z], index) => (
        <Block key={index} size={[0.05, 0.34, 0.05]} position={[x, 0.17, z]} color="#7c5a3b" radius={0.01} />
      ))}
      <Plant position={[-1.55, 0, -1.5]} scale={1.1} />
      {/* floor lamp */}
      <Cylinder position={[1.75, 0.8, -1.4]} radius={0.02} height={1.6} color="#475569" />
      <mesh position={[1.75, 1.65, -1.4]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 0.28, 20, 1, true]} />
        <meshStandardMaterial color="#fef3c7" side={DoubleSide} roughness={0.9} />
      </mesh>
    </>
  );
}

function BedroomFurniture() {
  return (
    <>
      <Block size={[2.6, 0.02, 2.4]} position={[0.3, 0.011, -0.4]} color="#e2d9cf" radius={0.01} cast={false} />
      <Block size={[1.8, 0.8, 0.1]} position={[0.3, 0.55, -1.93]} color="#8d6e63" radius={0.04} />
      <Block size={[1.7, 0.34, 2.0]} position={[0.3, 0.18, -0.9]} color="#8d6e63" radius={0.05} />
      <Block size={[1.62, 0.2, 1.95]} position={[0.3, 0.44, -0.88]} color="#f8fafc" radius={0.07} />
      <Block size={[0.62, 0.14, 0.36]} position={[-0.1, 0.6, -1.65]} color="#ffffff" radius={0.06} />
      <Block size={[0.62, 0.14, 0.36]} position={[0.7, 0.6, -1.65]} color="#ffffff" radius={0.06} />
      <Block size={[1.64, 0.1, 1.05]} position={[0.3, 0.57, -0.35]} color="#5b7fa6" radius={0.05} />
      <Block size={[0.42, 0.46, 0.4]} position={[-0.95, 0.23, -1.72]} color="#a1887f" radius={0.03} />
      <Block size={[0.42, 0.46, 0.4]} position={[1.55, 0.23, -1.72]} color="#a1887f" radius={0.03} />
      {/* dresser on the left wall */}
      <Block size={[0.46, 0.82, 1.2]} position={[-1.72, 0.41, 1.3]} color="#a1887f" radius={0.03} />
      <Plant position={[1.6, 0, 1.4]} scale={0.9} />
    </>
  );
}

function KitchenFurniture() {
  return (
    <>
      <Block size={[2.8, 0.88, 0.6]} position={[0.3, 0.44, -1.68]} color="#f1f5f9" radius={0.03} />
      <Block size={[2.85, 0.05, 0.65]} position={[0.3, 0.9, -1.66]} color="#475569" radius={0.015} roughness={0.35} />
      <Block size={[2.8, 0.45, 0.04]} position={[0.3, 1.15, -1.95]} color="#e2e8f0" radius={0.01} cast={false} />
      {/* hob */}
      {(
        [
          [-0.1, -1.8],
          [0.3, -1.8],
          [-0.1, -1.55],
          [0.3, -1.55],
        ] as [number, number][]
      ).map(([x, z], index) => (
        <Cylinder key={index} position={[x, 0.935, z]} radius={0.1} height={0.02} color="#0f172a" segments={24} />
      ))}
      {/* sink */}
      <Block size={[0.6, 0.03, 0.4]} position={[1.1, 0.925, -1.66]} color="#94a3b8" radius={0.01} metalness={0.8} roughness={0.25} />
      <Block size={[0.04, 0.2, 0.04]} position={[1.1, 1.02, -1.88]} color="#cbd5e1" radius={0.01} metalness={0.9} roughness={0.2} />
      {/* fridge on the left wall */}
      <Block size={[0.72, 1.85, 0.7]} position={[-1.58, 0.925, -1.4]} color="#e2e8f0" radius={0.05} metalness={0.3} roughness={0.35} />
      <Block size={[0.03, 0.5, 0.04]} position={[-1.2, 1.3, -1.15]} color="#94a3b8" radius={0.01} />
      {/* dining table and stools */}
      <Block size={[1.3, 0.07, 0.85]} position={[0.6, 0.76, 0.95]} color="#b08968" radius={0.03} />
      {(
        [
          [0.05, 0.6],
          [1.15, 0.6],
          [0.05, 1.3],
          [1.15, 1.3],
        ] as [number, number][]
      ).map(([x, z], index) => (
        <Block key={index} size={[0.06, 0.74, 0.06]} position={[x, 0.37, z]} color="#8a6a4d" radius={0.01} />
      ))}
      <Cylinder position={[0.3, 0.45, 1.65]} radius={0.17} height={0.06} color="#cbd5e1" />
      <Cylinder position={[0.3, 0.22, 1.65]} radius={0.03} height={0.44} color="#64748b" />
      <Cylinder position={[0.95, 0.45, 1.65]} radius={0.17} height={0.06} color="#cbd5e1" />
      <Cylinder position={[0.95, 0.22, 1.65]} radius={0.03} height={0.44} color="#64748b" />
    </>
  );
}

function BathroomFurniture() {
  return (
    <>
      {/* bathtub */}
      <Block size={[1.9, 0.55, 0.85]} position={[0.9, 0.275, -1.55]} color="#f8fafc" radius={0.12} roughness={0.3} />
      <Block size={[1.62, 0.05, 0.6]} position={[0.9, 0.55, -1.55]} color="#9ccfe6" radius={0.04} roughness={0.2} cast={false} />
      <Block size={[0.05, 0.3, 0.05]} position={[1.7, 0.7, -1.9]} color="#cbd5e1" radius={0.01} metalness={0.9} roughness={0.2} />
      {/* vanity with mirror */}
      <Block size={[0.9, 0.82, 0.5]} position={[-0.75, 0.41, -1.72]} color="#e2e8f0" radius={0.03} />
      <Block size={[0.5, 0.05, 0.34]} position={[-0.75, 0.84, -1.7]} color="#ffffff" radius={0.02} roughness={0.25} />
      <Block size={[0.7, 0.85, 0.03]} position={[-0.75, 1.55, -1.96]} color="#dbeafe" radius={0.01} metalness={0.9} roughness={0.1} cast={false} />
      {/* toilet */}
      <Block size={[0.4, 0.4, 0.55]} position={[-1.5, 0.2, -0.75]} color="#ffffff" radius={0.08} roughness={0.3} />
      <Block size={[0.2, 0.55, 0.38]} position={[-1.75, 0.55, -0.75]} color="#ffffff" radius={0.05} roughness={0.3} />
      <Block size={[1.2, 0.02, 0.8]} position={[0.5, 0.011, 0.9]} color="#a5c8d6" radius={0.01} cast={false} />
    </>
  );
}

function EntranceFurniture() {
  return (
    <>
      <Block size={[1.0, 0.02, 0.7]} position={[-1.2, 0.011, 0]} color="#94a3b8" radius={0.01} cast={false} />
      <Block size={[1.3, 0.5, 0.38]} position={[0.5, 0.25, -1.72]} color="#a1887f" radius={0.03} />
      <Block size={[0.9, 0.9, 0.03]} position={[0.5, 1.5, -1.96]} color="#dbeafe" radius={0.01} metalness={0.9} roughness={0.1} cast={false} />
      <Block size={[1.0, 0.08, 0.42]} position={[0.5, 0.55, -1.72]} color="#8d6e63" radius={0.02} />
      <Block size={[0.9, 0.42, 0.4]} position={[0.5, 0.21, 0.8]} color="#cbd5e1" radius={0.06} />
      <Plant position={[1.6, 0, -1.4]} />
    </>
  );
}

function OutdoorFurniture() {
  return (
    <>
      <Tree position={[1.2, 0, -1.2]} scale={1.1} />
      <Tree position={[-1.4, 0, -1.5]} scale={0.85} />
      {/* garden bench */}
      <Block size={[1.3, 0.07, 0.4]} position={[0.2, 0.45, 0.9]} color="#9a7551" radius={0.02} />
      <Block size={[1.3, 0.35, 0.06]} position={[0.2, 0.68, 1.08]} color="#9a7551" radius={0.02} />
      <Block size={[0.07, 0.43, 0.35]} position={[-0.4, 0.22, 0.9]} color="#6b5a4a" radius={0.01} />
      <Block size={[0.07, 0.43, 0.35]} position={[0.8, 0.22, 0.9]} color="#6b5a4a" radius={0.01} />
      {/* stepping stones */}
      {([-0.4, 0.2, 0.8] as number[]).map((z, index) => (
        <Cylinder key={index} position={[-1.2 + index * 0.1, 0.02, z - 1]} radius={0.28} height={0.04} color="#cbd5e1" segments={24} />
      ))}
    </>
  );
}

function OtherFurniture() {
  return (
    <>
      <Block size={[2.2, 0.02, 1.8]} position={[0.2, 0.011, 0.3]} color="#d7dde6" radius={0.01} cast={false} />
      <Block size={[0.9, 0.05, 0.9]} position={[0.2, 0.55, 0.3]} color="#b08968" radius={0.02} />
      <Block size={[0.08, 0.53, 0.08]} position={[0.2, 0.27, 0.3]} color="#8a6a4d" radius={0.01} />
      <Plant position={[1.5, 0, -1.4]} />
    </>
  );
}

function Furniture({ roomType }: { roomType: string }) {
  switch (roomType) {
    case "living_room":
      return <LivingRoomFurniture />;
    case "bedroom":
      return <BedroomFurniture />;
    case "kitchen":
      return <KitchenFurniture />;
    case "bathroom":
      return <BathroomFurniture />;
    case "entrance":
      return <EntranceFurniture />;
    case "outdoor":
      return <OutdoorFurniture />;
    default:
      return <OtherFurniture />;
  }
}

/* -------------------------------------------------------------------------- */
/*  Pin markers (clickable, show state)                                        */
/* -------------------------------------------------------------------------- */

function DeviceIcon({ type }: { type: string }) {
  const paths: Record<string, ReactNode> = {
    light: (
      <>
        <path d="M9 18h6M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
      </>
    ),
    fan: (
      <>
        <circle cx="12" cy="12" r="1.5" />
        <path d="M12 10.5C12 6 13 4 15 4s2 2.5 0 4.5L13 10.5M13.5 12c4.5 0 6.5 1 6.5 3s-2.500 2-4.500 0L13.500 13M12 13.500c0 4.500-1 6.500-3 6.500s-2-2.500 0-4.500l2-2M10.500 12C6 12 4 11 4 9s2.500-2 4.500 0l2 2" />
      </>
    ),
    air_conditioner: (
      <>
        <path d="M12 3v18M4.200 7.500l15.600 9M4.200 16.500l15.600-9" />
        <path d="M9.500 4.500 12 6.500l2.500-2M9.500 19.500 12 17.500l2.500 2" />
      </>
    ),
    television: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    door: (
      <>
        <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18" />
        <path d="M14.500 12h.01" />
      </>
    ),
    window: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <path d="M12 3v18M5 12h14" />
      </>
    ),
    curtain: (
      <>
        <path d="M3 4h18" />
        <path d="M5 4c0 6 1 11 4 16M19 4c0 6-1 11-4 16M12 4v6" />
      </>
    ),
    security_camera: (
      <>
        <path d="M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4z" />
        <path d="m17 10 4-2v8l-4-2" />
      </>
    ),
    exhaust_fan: (
      <>
        <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2 2 0 1 1-2 2" />
      </>
    ),
  };
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type] ?? <circle cx="12" cy="12" r="6" />}
    </svg>
  );
}

function Pin({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const visible = useContext(PinsVisible);
  const htmlPortal = useContext(HtmlPortal);
  const { anchors, focusedDeviceId, selectMode } = useContext(FocusContext);
  const active = isActive(device);
  const focused = focusedDeviceId === device.id;
  const anchorRef = useCallback(
    (node: Group | null) => {
      if (node) anchors.set(device.id, node);
      else anchors.delete(device.id);
    },
    [anchors, device.id],
  );
  return (
    <group ref={anchorRef} position={position}>
      {visible && (
        <Html center zIndexRange={[20, 0]} portal={htmlPortal ?? undefined}>
          <button
            type="button"
            aria-label={`${device.name}: ${stateWord(device)}. ${selectMode ? "Click to focus." : "Click to switch."}`}
            aria-pressed={selectMode ? focused : undefined}
            title={`${device.name} · ${stateWord(device)}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(device);
            }}
            className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-md transition hover:scale-110 ${
              active ? "border-white bg-sky-500 text-white" : "border-slate-300 bg-white text-slate-500"
            } ${focused ? "scale-125 ring-4 ring-sky-300/70" : ""}`}
          >
            <DeviceIcon type={device.device_type} />
          </button>
        </Html>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Appliances. Positions are in room coordinates: floor at y = 0, +x right,   */
/*  +z towards the viewer. The back wall is z = -2 and the left wall is x = -2. */
/* -------------------------------------------------------------------------- */

function Pendant({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const on = Boolean(device.state?.is_on);
  const level = (device.state?.brightness ?? 100) / 100;
  const [x, , z] = position;
  return (
    <group position={[x, 0, z]} onClick={clickable(device, onToggle)}>
      <Cylinder position={[0, WALL_H - 0.3, 0]} radius={0.012} height={0.6} color="#334155" segments={8} />
      <Cylinder position={[0, WALL_H - 0.01, 0]} radius={0.08} height={0.04} color="#e2e8f0" />
      <mesh position={[0, WALL_H - 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.3, 0.26, 28, 1, true]} />
        <meshStandardMaterial color={on ? "#fff7e0" : "#e2e8f0"} side={DoubleSide} roughness={0.8} emissive="#ffe3a3" emissiveIntensity={on ? 0.35 * level : 0} />
      </mesh>
      <mesh position={[0, WALL_H - 0.8, 0]}>
        <sphereGeometry args={[0.09, 18, 16]} />
        <meshStandardMaterial color={on ? "#fff3cc" : "#cbd5e1"} emissive="#ffd27a" emissiveIntensity={on ? 2.2 * level : 0} />
      </mesh>
      {on && <pointLight position={[0, WALL_H - 0.9, 0]} color="#ffd9a0" intensity={4.5 * level} decay={2} distance={7} />}
      <Pin device={device} position={[0, WALL_H + 0.25, 0]} onToggle={onToggle} />
    </group>
  );
}

function GardenLamp({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const on = Boolean(device.state?.is_on);
  const level = (device.state?.brightness ?? 100) / 100;
  const [x, , z] = position;
  return (
    <group position={[x, 0, z]} onClick={clickable(device, onToggle)}>
      <Cylinder position={[0, 0.6, 0]} radius={0.04} height={1.2} color="#334155" />
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.16, 18, 16]} />
        <meshStandardMaterial color={on ? "#fff3cc" : "#e2e8f0"} emissive="#ffd27a" emissiveIntensity={on ? 2 * level : 0} />
      </mesh>
      {on && <pointLight position={[0, 1.3, 0]} color="#ffd9a0" intensity={3 * level} decay={2} distance={6} />}
      <Pin device={device} position={[0, 1.8, 0]} onToggle={onToggle} />
    </group>
  );
}

function CeilingFan({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const blades = useRef<Group>(null);
  const spin = useRef(0);
  const on = Boolean(device.state?.is_on);
  const speed = device.state?.speed ?? 1;
  useFrame((_, delta) => {
    spin.current = MathUtils.damp(spin.current, on ? speed * 3 : 0, 3, delta);
    if (blades.current) blades.current.rotation.y += delta * spin.current;
  });
  const [x, , z] = position;
  return (
    <group position={[x, WALL_H - 0.4, z]} onClick={clickable(device, onToggle)}>
      <Cylinder position={[0, 0.2, 0]} radius={0.02} height={0.4} color="#475569" segments={8} />
      <Cylinder position={[0, 0.4, 0]} radius={0.1} height={0.04} color="#e2e8f0" />
      <Cylinder position={[0, 0, 0]} radius={0.1} height={0.1} color={on ? "#7dd3fc" : "#94a3b8"} />
      <group ref={blades}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <Block size={[0.62, 0.025, 0.17]} position={[0.42, 0, 0]} color={on ? "#f1f5f9" : "#cbd5e1"} radius={0.01} />
          </group>
        ))}
      </group>
      <Pin device={device} position={[0, 0.75, 0]} onToggle={onToggle} />
    </group>
  );
}

function ExhaustFan({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const blades = useRef<Group>(null);
  const spin = useRef(0);
  const on = Boolean(device.state?.is_on);
  const speed = device.state?.speed ?? 1;
  useFrame((_, delta) => {
    spin.current = MathUtils.damp(spin.current, on ? speed * 6 : 0, 3, delta);
    if (blades.current) blades.current.rotation.z += delta * spin.current;
  });
  return (
    <group position={position} onClick={clickable(device, onToggle)}>
      <Cylinder position={[0, 0, 0.04]} radius={0.27} height={0.08} color="#e2e8f0" rotation={[Math.PI / 2, 0, 0]} segments={28} />
      <mesh position={[0, 0, 0.085]}>
        <torusGeometry args={[0.24, 0.015, 8, 28]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <group ref={blades} position={[0, 0, 0.09]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
            <boxGeometry args={[0.44, 0.07, 0.01]} />
            <meshStandardMaterial color={on ? "#38bdf8" : "#64748b"} />
          </mesh>
        ))}
      </group>
      <Pin device={device} position={[0, 0.5, 0.2]} onToggle={onToggle} />
    </group>
  );
}

function AirConditioner({ device, position, onToggle }: { device: SceneDevice; position: V3; onToggle: Toggle }) {
  const flow = useRef<MeshBasicMaterial>(null);
  const on = Boolean(device.state?.is_on);
  useFrame(({ clock }) => {
    if (flow.current) flow.current.opacity = on ? 0.14 + 0.07 * Math.sin(clock.elapsedTime * 2.4) : 0;
  });
  return (
    <group position={position} onClick={clickable(device, onToggle)}>
      <Block size={[1.05, 0.3, 0.24]} position={[0, 0, 0.12]} color="#f8fafc" radius={0.06} roughness={0.35} />
      <Block size={[0.95, 0.035, 0.02]} position={[0, -0.09, 0.245]} color="#475569" radius={0.005} />
      <mesh position={[0.4, 0.05, 0.25]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial color={on ? "#4ade80" : "#475569"} emissive={on ? "#4ade80" : "#000000"} emissiveIntensity={on ? 2 : 0} />
      </mesh>
      <mesh position={[0, -0.55, 0.55]} rotation={[-0.95, 0, 0]}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial ref={flow} color="#93c5fd" transparent opacity={0} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Pin device={device} position={[0, 0.5, 0.3]} onToggle={onToggle} />
    </group>
  );
}

function Television({
  device,
  onWall,
  onToggle,
}: {
  device: SceneDevice;
  onWall: "back" | "left";
  onToggle: Toggle;
}) {
  const screen = useRef<MeshBasicMaterial>(null);
  const on = Boolean(device.state?.is_on);
  useFrame(({ clock }) => {
    if (!screen.current) return;
    screen.current.color.setHSL(0.58 + 0.04 * Math.sin(clock.elapsedTime * 0.7), 0.7, on ? 0.5 : 0.04);
  });
  const placement: { position: V3; rotation: V3 } =
    onWall === "back"
      ? { position: [0.9, 0, -1.72], rotation: [0, 0, 0] }
      : { position: [-1.72, 0, 1.3], rotation: [0, Math.PI / 2, 0] };
  return (
    <group position={placement.position} rotation={placement.rotation} onClick={clickable(device, onToggle)}>
      <Block size={[1.5, 0.46, 0.4]} position={[0, 0.23, 0]} color="#8d6e63" radius={0.03} />
      <Block size={[0.4, 0.03, 0.18]} position={[0, 0.48, 0]} color="#1e293b" radius={0.01} />
      <Block size={[1.0, 0.58, 0.05]} position={[0, 0.82, 0]} color="#0b1120" radius={0.02} />
      <mesh position={[0, 0.82, 0.03]}>
        <planeGeometry args={[0.94, 0.52]} />
        <meshBasicMaterial ref={screen} color="#050a14" toneMapped={false} />
      </mesh>
      <Pin device={device} position={[0, 1.3, 0.1]} onToggle={onToggle} />
    </group>
  );
}

function Door({ device, onToggle }: { device: SceneDevice; onToggle: Toggle }) {
  const leaf = useRef<Group>(null);
  const open = Boolean(device.state?.is_open);
  useFrame((_, delta) => {
    if (leaf.current) leaf.current.rotation.y = MathUtils.damp(leaf.current.rotation.y, open ? 1.35 : 0, 6, delta);
  });
  return (
    <group position={[-HALF, 0, 0]} onClick={clickable(device, onToggle)}>
      {[-1, 1].map((side) => (
        <Block key={side} size={[0.17, DOOR_H + 0.05, 0.07]} position={[0, DOOR_H / 2, side * (DOOR_W / 2 + 0.035)]} color="#475569" radius={0.01} />
      ))}
      <Block size={[0.17, 0.07, DOOR_W + 0.14]} position={[0, DOOR_H + 0.035, 0]} color="#475569" radius={0.01} />
      <group ref={leaf} position={[0, 0, -DOOR_W / 2]}>
        <Block size={[0.06, DOOR_H - 0.03, DOOR_W - 0.04]} position={[0, (DOOR_H - 0.03) / 2, DOOR_W / 2]} color="#8b5e3c" radius={0.02} />
        <mesh position={[0.06, 1.0, DOOR_W - 0.14]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <Pin device={device} position={[0.35, DOOR_H + 0.35, 0]} onToggle={onToggle} />
    </group>
  );
}

function WindowAndCurtain({
  windowDevice,
  curtain,
  onToggle,
}: {
  windowDevice?: SceneDevice;
  curtain?: SceneDevice;
  onToggle: Toggle;
}) {
  const sash = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const windowOpen = Boolean(windowDevice?.state?.is_open);
  const curtainOpen = Boolean(curtain?.state?.is_open);
  useFrame((_, delta) => {
    if (sash.current) sash.current.position.x = MathUtils.damp(sash.current.position.x, windowOpen ? -0.26 : 0.26, 5, delta);
    for (const [ref, side] of [[left, -1], [right, 1]] as const) {
      if (!ref.current) continue;
      ref.current.position.x = MathUtils.damp(ref.current.position.x, side * (curtainOpen ? 0.66 : 0.3), 5, delta);
      ref.current.scale.x = MathUtils.damp(ref.current.scale.x, curtainOpen ? 0.4 : 1, 5, delta);
    }
  });
  // Local frame: the wall plane is z = 0 and +z points into the room. The group is turned to sit on the left wall.
  return (
    <group position={[-HALF + 0.02, 1.6, 1.25]} rotation={[0, Math.PI / 2, 0]}>
      {windowDevice && (
        <group onClick={clickable(windowDevice, onToggle)}>
          <Block size={[1.18, 0.07, 0.12]} position={[0, 0.5, 0]} color="#f8fafc" radius={0.01} />
          <Block size={[1.18, 0.07, 0.12]} position={[0, -0.5, 0]} color="#f8fafc" radius={0.01} />
          <Block size={[0.07, 1.0, 0.12]} position={[-0.56, 0, 0]} color="#f8fafc" radius={0.01} />
          <Block size={[0.07, 1.0, 0.12]} position={[0.56, 0, 0]} color="#f8fafc" radius={0.01} />
          <Block size={[1.3, 0.05, 0.2]} position={[0, -0.56, 0.05]} color="#e2e8f0" radius={0.01} />
          <mesh position={[-0.26, 0, 0]}>
            <boxGeometry args={[0.5, 0.92, 0.015]} />
            <meshPhysicalMaterial color="#9ad0ff" transparent opacity={0.4} roughness={0.05} />
          </mesh>
          <group ref={sash}>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.5, 0.92, 0.015]} />
              <meshPhysicalMaterial color="#9ad0ff" transparent opacity={0.4} roughness={0.05} />
            </mesh>
            <Block size={[0.04, 0.94, 0.04]} position={[-0.25, 0, 0.03]} color="#f8fafc" radius={0.005} />
          </group>
          <Pin device={windowDevice} position={[0, 0.85, 0.2]} onToggle={onToggle} />
        </group>
      )}
      {curtain && (
        <group position={[0, 0, 0.14]} onClick={clickable(curtain, onToggle)}>
          <Cylinder position={[0, 0.62, 0]} radius={0.02} height={1.6} color="#475569" rotation={[0, 0, Math.PI / 2]} segments={10} />
          <group ref={left} position={[-0.3, -0.1, 0]}>
            <Block size={[0.6, 1.3, 0.06]} position={[0, 0, 0]} color="#8fae9a" radius={0.025} />
          </group>
          <group ref={right} position={[0.3, -0.1, 0]}>
            <Block size={[0.6, 1.3, 0.06]} position={[0, 0, 0]} color="#8fae9a" radius={0.025} />
          </group>
          <Pin device={curtain} position={[0, windowDevice ? 1.2 : 0.85, 0.2]} onToggle={onToggle} />
        </group>
      )}
    </group>
  );
}

function SecurityCamera({
  device,
  position,
  onToggle,
}: {
  device: SceneDevice;
  position: V3;
  onToggle: Toggle;
}) {
  const on = Boolean(device.state?.is_on);
  return (
    <group position={position} rotation={[0.5, Math.PI / 4, 0]} onClick={clickable(device, onToggle)}>
      <Block size={[0.14, 0.12, 0.32]} position={[0, 0, 0.16]} color="#e2e8f0" radius={0.04} roughness={0.4} />
      <mesh position={[0, 0, 0.34]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0.05, 0.06, 0.3]}>
        <sphereGeometry args={[0.014, 8, 8]} />
        <meshStandardMaterial color={on ? "#ef4444" : "#3f3f46"} emissive={on ? "#ef4444" : "#000000"} emissiveIntensity={on ? 2.5 : 0} />
      </mesh>
      {on && (
        <mesh position={[0, 0, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.75, 2.4, 24, 1, true]} />
          <meshBasicMaterial color="#fca5a5" transparent opacity={0.09} side={DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <Pin device={device} position={[0, 0.45, 0.1]} onToggle={onToggle} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  One room                                                                   */
/* -------------------------------------------------------------------------- */

type RoomProps = {
  room: SceneRoom;
  position: V3;
  selected: boolean;
  onSelect: () => void;
  devices: SceneDevice[];
  onToggle: Toggle;
  interiorLeft: boolean;
  interiorBack: boolean;
  borderRight: boolean;
  borderFront: boolean;
};

function Room({ room, position, selected, onSelect, devices, onToggle, interiorLeft, interiorBack, borderRight, borderFront }: RoomProps) {
  const type = FLOORS[room.room_type] ? room.room_type : "other";
  const outdoor = type === "outdoor";
  const lights = devices.filter((device) => device.device_type === "light");
  const htmlPortal = useContext(HtmlPortal);
  const { anchors } = useContext(FocusContext);
  const roomAnchor = useCallback(
    (node: Group | null) => {
      if (node) anchors.set(`room:${room.id}`, node);
      else anchors.delete(`room:${room.id}`);
    },
    [anchors, room.id],
  );
  const find = (deviceType: string) => devices.find((device) => device.device_type === deviceType);
  const fan = find("fan");
  const exhaust = find("exhaust_fan");
  const door = find("door");
  const windowDevice = find("window");
  const curtain = find("curtain");
  const ac = find("air_conditioner");
  const tv = find("television");
  const camera = find("security_camera");

  return (
    <PinsVisible.Provider value={selected}>
    <group ref={roomAnchor} position={position}>
      {/* floor slab: clicking it selects the room */}
      <mesh
        position={[0, -0.07, 0]}
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[ROOM, 0.14, ROOM]} />
        <meshStandardMaterial
          color={FLOORS[type]}
          roughness={0.9}
          emissive={selected ? "#38bdf8" : "#000000"}
          emissiveIntensity={selected ? 0.22 : 0}
        />
      </mesh>

      {!outdoor && <Wall axis="z" gap={interiorLeft || Boolean(door)} interior={interiorLeft} />}
      {!outdoor && <Wall axis="x" gap={interiorBack} interior={interiorBack} />}
      {borderRight && <Block size={[0.1, 0.14, ROOM]} position={[HALF - 0.05, 0.07, 0]} color={BORDER} radius={0.02} />}
      {borderFront && <Block size={[ROOM, 0.14, 0.1]} position={[0, 0.07, HALF - 0.05]} color={BORDER} radius={0.02} />}

      <Furniture roomType={type} />

      {/* appliances */}
      {lights.map((device, index) => {
        const x = ((index % 4) - (Math.min(lights.length, 4) - 1) / 2) * 0.95;
        const z = -0.5 + Math.floor(index / 4) * 0.9;
        return outdoor ? (
          <GardenLamp key={device.id} device={device} position={[x * 1.3, 0, 0.1 + z * 0.5]} onToggle={onToggle} />
        ) : (
          <Pendant key={device.id} device={device} position={[x, 0, z]} onToggle={onToggle} />
        );
      })}
      {!outdoor && fan && <CeilingFan device={fan} position={[0, 0, 0.75]} onToggle={onToggle} />}
      {!outdoor && exhaust && <ExhaustFan device={exhaust} position={[1.3, 2.0, -HALF + 0.02]} onToggle={onToggle} />}
      {!outdoor && ac && <AirConditioner device={ac} position={[-0.2, 2.0, -HALF + 0.06]} onToggle={onToggle} />}
      {!outdoor && tv && <Television device={tv} onWall={type === "living_room" || type === "other" ? "back" : "left"} onToggle={onToggle} />}
      {!outdoor && door && <Door device={door} onToggle={onToggle} />}
      {!outdoor && (windowDevice || curtain) && <WindowAndCurtain windowDevice={windowDevice} curtain={curtain} onToggle={onToggle} />}
      {camera && <SecurityCamera device={camera} position={outdoor ? [-1.5, 1.6, -1.5] : [-HALF + 0.2, WALL_H - 0.3, -HALF + 0.2]} onToggle={onToggle} />}

      <Html position={[0, 0.03, HALF - 0.3]} center zIndexRange={[10, 0]} portal={htmlPortal ?? undefined}>
        <button
          type="button"
          onClick={onSelect}
          className={`pointer-events-auto whitespace-nowrap rounded-full px-3 py-1 text-xs shadow ${
            selected ? "bg-sky-500 text-white" : "bg-white/90 text-slate-700"
          }`}
        >
          {room.name}
        </button>
      </Html>
    </group>
    </PinsVisible.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Camera framing                                                             */
/* -------------------------------------------------------------------------- */

function FitCamera({ width, depth }: { width: number; depth: number }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    if (!ortho.isOrthographicCamera) return;
    const horizontal = (width + depth) * Math.SQRT1_2;
    const vertical = horizontal * 0.66 + WALL_H * 0.75 + 0.6;
    ortho.zoom = Math.min(size.width / (horizontal * 1.1), size.height / (vertical * 1.2));
    ortho.updateProjectionMatrix();
  }, [camera, size.width, size.height, width, depth]);
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Camera focus. Moves the existing orthographic camera and orbit target       */
/*  towards a room or device, keeping the viewing angle, and back again.       */
/* -------------------------------------------------------------------------- */

type Pose = { zoom: number; position: Vector3; target: Vector3 };
type OrbitLike = { target: Vector3; update: () => void };
type Tween = { from: Pose; to: Pose; start: number; duration: number };

const FOCUS_ZOOM = { device: 2.6, room: 1.7 } as const;
const FOCUS_MS = 650;
const MAX_ZOOM = 160;
const ORBIT_TARGET: V3 = [0, 0.9, 0];

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function CameraRig({ focus }: { focus: SceneFocus | null }) {
  const { anchors } = useContext(FocusContext);
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const controls = useThree((state) => state.controls) as unknown as OrbitLike | null;
  const home = useRef<Pose | null>(null);
  const tween = useRef<Tween | null>(null);
  const key = focus ? `${focus.type}:${focus.id}` : "";

  useEffect(() => {
    if (!controls) return;
    const snapshot = (): Pose => ({ zoom: camera.zoom, position: camera.position.clone(), target: controls.target.clone() });

    let to: Pose | null = null;
    if (focus) {
      const node = anchors.get(focus.type === "device" ? focus.id : `room:${focus.id}`);
      if (!node) return;
      if (!home.current) home.current = snapshot();
      node.updateWorldMatrix(true, false);
      const point = node.getWorldPosition(new Vector3());
      if (focus.type === "room") point.y += 1;
      const shift = point.clone().sub(home.current.target);
      to = {
        zoom: Math.min(MAX_ZOOM, home.current.zoom * FOCUS_ZOOM[focus.type]),
        position: home.current.position.clone().add(shift),
        target: point,
      };
    } else if (home.current) {
      to = home.current;
      home.current = null;
    }
    if (!to) return;

    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tween.current = { from: snapshot(), to, start: performance.now(), duration: reduceMotion ? 0 : FOCUS_MS };
    // `key` stands in for `focus`, which is a new object on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, anchors, camera, controls]);

  useFrame(() => {
    const active = tween.current;
    if (!active || !controls) return;
    const progress = active.duration === 0 ? 1 : Math.min(1, (performance.now() - active.start) / active.duration);
    const eased = easeInOut(progress);
    camera.zoom = MathUtils.lerp(active.from.zoom, active.to.zoom, eased);
    camera.position.lerpVectors(active.from.position, active.to.position, eased);
    controls.target.lerpVectors(active.from.target, active.to.target, eased);
    camera.updateProjectionMatrix();
    controls.update();
    if (progress >= 1) tween.current = null;
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  The house                                                                  */
/* -------------------------------------------------------------------------- */

export function HouseScene({ rooms, devices, selectedRoomId, onSelectRoom, temperature, onToggle, onSelectDevice, focus, onReady }: Props) {
  const portalRef = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<string, Object3D>());
  const focusedDeviceId = focus?.type === "device" ? focus.id : "";
  const selectMode = Boolean(onSelectDevice);
  const focusContext = useMemo(
    () => ({ anchors: anchors.current, focusedDeviceId, selectMode }),
    [focusedDeviceId, selectMode],
  );
  const handleDevice = onSelectDevice ?? onToggle;
  const placed = useMemo(() => {
    const ranked = rooms
      .map((room, index) => ({ room, index, rank: ROOM_ORDER.indexOf(room.room_type) }))
      .sort((a, b) => (a.rank === -1 ? 99 : a.rank) - (b.rank === -1 ? 99 : b.rank) || a.index - b.index);
    return ranked.slice(0, MAX_ROOMS).map((entry) => entry.room);
  }, [rooms]);

  if (placed.length === 0) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted">
        Add a room below to start building your house.
      </div>
    );
  }

  const count = placed.length;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const rowCount = Math.ceil(count / cols);
  const width = cols * ROOM;
  const depth = rowCount * ROOM;
  const slotOf = (index: number) => ({ col: index % cols, row: Math.floor(index / cols) });
  const occupied = (col: number, row: number) => row * cols + col < count && col < cols && row >= 0;

  return (
    <div className="relative h-full min-h-64 overflow-hidden">
      <div ref={portalRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
      <Canvas
        orthographic
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [17, 21, 17], zoom: 40, near: -80, far: 140 }}
        onCreated={() => requestAnimationFrame(() => onReady?.())}
      >
        <HtmlPortal.Provider value={portalRef as RefObject<HTMLElement>}>
        <FocusContext.Provider value={focusContext}>
        <color attach="background" args={["#e4ebf7"]} />
        <FitCamera width={width} depth={depth} />
        <ambientLight intensity={0.8} />
        <hemisphereLight args={["#ffffff", "#aab6cc", 0.6]} />
        <directionalLight
          position={[9, 15, 7]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-14}
          shadow-camera-right={14}
          shadow-camera-top={14}
          shadow-camera-bottom={-14}
          shadow-camera-near={1}
          shadow-camera-far={50}
          shadow-bias={-0.0004}
        />

        {/* base plate under the whole house */}
        <mesh position={[0, -0.27, 0]} receiveShadow>
          <boxGeometry args={[width + 0.7, 0.25, depth + 0.7]} />
          <meshStandardMaterial color="#c3cde2" roughness={0.9} />
        </mesh>

        {placed.map((room, index) => {
          const { col, row } = slotOf(index);
          return (
            <Room
              key={room.id}
              room={room}
              position={[(col - (cols - 1) / 2) * ROOM, 0, (row - (rowCount - 1) / 2) * ROOM]}
              selected={room.id === selectedRoomId}
              onSelect={() => onSelectRoom(room.id)}
              devices={devices.filter((device) => device.room_id === room.id)}
              onToggle={handleDevice}
              interiorLeft={col > 0}
              interiorBack={row > 0}
              borderRight={!occupied(col + 1, row)}
              borderFront={!occupied(col, row + 1)}
            />
          );
        })}

        <CameraRig focus={focus ?? null} />
        <OrbitControls
          makeDefault
          enablePan={false}
          target={ORBIT_TARGET}
          minZoom={14}
          maxZoom={160}
          minPolarAngle={0.45}
          maxPolarAngle={1.3}
          minAzimuthAngle={0.15}
          maxAzimuthAngle={1.42}
        />
        </FocusContext.Provider>
        </HtmlPortal.Provider>
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 space-y-1 text-xs">
        <p className="inline-block rounded bg-white/85 px-2 py-1 text-slate-700 shadow">
          {temperature === undefined ? "No simulation yet" : `${temperature.toFixed(1)} °C simulated`}
        </p>
        <p className="text-slate-500">{selectMode ? "Select a room, then click a device to focus it. Drag to rotate, scroll or pinch to zoom." : "Select a room to see its pins. Click any appliance to switch it. Drag to rotate."}</p>
        {rooms.length > MAX_ROOMS && <p className="text-amber-700">Showing the first {MAX_ROOMS} rooms.</p>}
      </div>
    </div>
  );
}
