import { useEffect, useRef } from "react";
import { VoicePanel } from "../VoicePanel";
import { Icon } from "../ui/Icon";
import type { VoiceApi } from "../../hooks/useVoice";

type Props = {
  voice: VoiceApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Header microphone button that opens the VoicePanel (with the typed-command box) in a popover.
 * The Home AI orb listens directly and shares the same `voice` engine.
 */
export function VoiceDock({ voice, open, onOpenChange }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const { listening } = voice;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    function onPointer(event: PointerEvent) {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="voice-popover"
        className={`inline-flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-ink sm:px-4 ${
          listening ? "anim-pulse-ring" : ""
        }`}
      >
        <Icon name="mic" size={18} />
        <span className="hidden sm:inline">{listening ? "Listening…" : "Voice"}</span>
        <span className="sr-only sm:hidden">Voice</span>
      </button>
      <div id="voice-popover" hidden={!open} className="anim-fade absolute right-0 top-full z-40 mt-2 w-[min(92vw,24rem)] shadow-xl">
        <VoicePanel voice={voice} />
      </div>
    </div>
  );
}
