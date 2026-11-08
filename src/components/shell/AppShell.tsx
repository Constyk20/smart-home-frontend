import type { ReactNode } from "react";
import { Icon, type IconName } from "../ui/Icon";

export type SectionId = "overview" | "rooms" | "devices" | "automations" | "energy" | "security" | "settings";

export const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: "overview", label: "Home", icon: "home" },
  { id: "rooms", label: "Rooms", icon: "rooms" },
  { id: "devices", label: "Devices", icon: "devices" },
  { id: "automations", label: "Automations", icon: "clock" },
  { id: "energy", label: "Energy", icon: "bolt" },
  { id: "security", label: "Security", icon: "shield" },
  { id: "settings", label: "Settings", icon: "sliders" },
];

type Props = {
  active: SectionId;
  onNavigate: (section: SectionId) => void;
  header: ReactNode;
  children: ReactNode;
};

/** Page frame: header slot, section pills (tablet and up), bottom tab bar (phones). */
export function AppShell({ active, onNavigate, header, children }: Props) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1680px] px-3 pb-24 pt-4 sm:px-5 md:pb-10">
        {header}

        <nav aria-label="Sections" className="mt-4 hidden gap-1 overflow-x-auto rounded-full bg-card/80 p-1 shadow-sm md:flex">
          {SECTIONS.map((section) => {
            const current = section.id === active;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                aria-current={current ? "page" : undefined}
                className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  current ? "bg-ink text-white" : "text-ink-2 hover:bg-field"
                }`}
              >
                <Icon name={section.icon} size={16} />
                <span className="hidden lg:inline">{section.label}</span>
                <span className="sr-only lg:hidden">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="mt-4">{children}</main>
      </div>

      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-card px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {SECTIONS.map((section) => {
          const current = section.id === active;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              aria-current={current ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 py-2"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${current ? "bg-ink text-white" : "text-ink-2"}`}>
                <Icon name={section.icon} size={18} />
              </span>
              <span className={`text-[10px] leading-none ${current ? "font-semibold text-ink" : "text-muted"}`}>{section.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
