import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { useNow } from "../../hooks/useNow";
import type { Connection } from "../../types";

type Props = {
  userName?: string;
  houseName: string;
  connection: Connection;
  indoorTemperature?: number;
  attention: number;
  onOpenAttention: () => void;
  voice: ReactNode;
};

const CONNECTION_TEXT: Record<Connection, string> = { connecting: "Connecting", live: "Live", offline: "Offline" };
const CONNECTION_STYLE: Record<Connection, string> = {
  connecting: "bg-field text-muted",
  live: "bg-ok-soft text-ok",
  offline: "bg-danger-soft text-danger",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Header({ userName, houseName, connection, indoorTemperature, attention, onOpenAttention, voice }: Props) {
  const now = useNow(30_000);
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink">
          {userName ? initials(userName) : <Icon name="user" size={18} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{userName ? `Welcome back, ${userName}` : "Welcome back"}</p>
          <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{houseName || "My home"}</h1>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-brand shadow-sm">
          <Icon name="home" size={16} />
        </span>
        <p className="whitespace-nowrap text-sm font-semibold text-ink">Smart Home Dashboard</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onOpenAttention}
          aria-label={attention > 0 ? `${attention} item${attention === 1 ? "" : "s"} need attention. Open Security.` : "No alerts. Open Security."}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink-2 shadow-sm hover:bg-field-strong"
        >
          <Icon name="bell" size={18} />
          {attention > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {attention}
            </span>
          )}
        </button>
        <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:inline-flex ${CONNECTION_STYLE[connection]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {CONNECTION_TEXT[connection]}
        </span>
        {indoorTemperature !== undefined && (
          <span className="hidden rounded-full bg-card px-3 py-1 text-xs font-medium text-ink-2 shadow-sm lg:inline-block" title="Simulated indoor temperature">
            {indoorTemperature.toFixed(1)}°C <span className="text-muted">sim</span>
          </span>
        )}
        <span className="hidden whitespace-nowrap rounded-full bg-card px-3 py-1 text-xs font-medium text-ink-2 shadow-sm lg:inline-block">
          {date} · {time}
        </span>
        {voice}
      </div>
    </header>
  );
}
