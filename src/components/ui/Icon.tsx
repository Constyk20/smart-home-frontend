import type { ReactNode } from "react";

export type IconName =
  | "home" | "rooms" | "devices" | "clock" | "bolt" | "shield" | "sliders" | "mic" | "plus" | "trash" | "close"
  | "bulb" | "wind" | "thermo" | "tv" | "door" | "window" | "curtain" | "camera" | "power"
  | "sofa" | "bed" | "kitchen" | "bath" | "tree" | "box" | "moon" | "back" | "logout" | "check" | "alert" | "bell" | "user" | "cube" | "fan";

// Stroke icons drawn on a 24 x 24 grid. Kept inline so the app needs no icon package.
const PATHS: Record<IconName, ReactNode> = {
  home: <><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  rooms: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>,
  devices: <><rect x="1" y="6" width="22" height="12" rx="6" /><circle cx="16" cy="12" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  bulb: <><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></>,
  wind: <path d="M9.6 4.6A2 2 0 1 1 11 8H2m10.6 11.4A2 2 0 1 0 14 16H2m15.7-8.3A2.5 2.5 0 1 1 19.5 12H2" />,
  thermo: <path d="M14 14.8V3.5a2.5 2.5 0 0 0-5 0v11.3a4.5 4.5 0 1 0 5 0z" />,
  tv: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M17 2l-5 5-5-5" /></>,
  door: <><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18" /><path d="M15 12h.01" /></>,
  window: <><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M12 3v18M3 12h18" /></>,
  curtain: <><path d="M3 3h18M5 3v18M19 3v18" /><path d="M5 12c4 0 5-4 7-9 2 5 3 9 7 9" /></>,
  camera: <><path d="M23 7l-7 5 7 5z" /><rect x="1" y="5" width="15" height="14" rx="2" /></>,
  power: <><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /><path d="M12 2v10" /></>,
  sofa: <><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 13a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5H2z" /><path d="M6 21v-3M18 21v-3" /></>,
  bed: <><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20" /><path d="M6 10V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" /></>,
  kitchen: <><path d="M4 3v7a2 2 0 0 0 4 0V3M6 3v18" /><path d="M18 21V3c-2 1-3 4-3 8h3" /></>,
  bath: <><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" /></>,
  tree: <><circle cx="12" cy="9" r="6" /><path d="M12 15v7" /></>,
  box: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  moon: <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  cube: <><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M12 12l9-5M12 12L3 7M12 12v10" /></>,
  fan: <><circle cx="12" cy="12" r="2" /><path d="M12 10c0-4 1-7 4-7 2 0 2 3 0 5l-3 3M14 12c4 0 7 1 7 4 0 2-3 2-5 0l-3-3M12 14c0 4-1 7-4 7-2 0-2-3 0-5l3-3M10 12c-4 0-7-1-7-4 0-2 3-2 5 0l3 3" /></>,
  alert: <><path d="M12 3L2 21h20z" /><path d="M12 10v5M12 18h.01" /></>,
};

type Props = { name: IconName; size?: number; className?: string };

export function Icon({ name, size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

const DEVICE_ICONS: Record<string, IconName> = {
  light: "bulb",
  fan: "wind",
  exhaust_fan: "wind",
  air_conditioner: "thermo",
  television: "tv",
  door: "door",
  window: "window",
  curtain: "curtain",
  security_camera: "camera",
};

export function deviceIcon(deviceType: string): IconName {
  return DEVICE_ICONS[deviceType] ?? "power";
}

const ROOM_ICONS: Record<string, IconName> = {
  living_room: "sofa",
  bedroom: "bed",
  kitchen: "kitchen",
  bathroom: "bath",
  entrance: "door",
  outdoor: "tree",
  other: "box",
};

export function roomIcon(roomType: string): IconName {
  return ROOM_ICONS[roomType] ?? "box";
}
