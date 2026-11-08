import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { api, errorMessage } from "../api";

type DeviceState = { is_on?: boolean; is_open?: boolean; brightness?: number; target_temp?: number; speed?: number };
type Device = { id: string; name: string; device_type: string; state: DeviceState };

type Props = {
  devices: Device[];
  onChanged: () => Promise<void> | void;
  /** Lets the page show a pulsing mic button while the microphone is open. */
  onListeningChange?: (listening: boolean) => void;
};

type Status = "idle" | "listening" | "working" | "ok" | "error";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Ready",
  listening: "Listening…",
  working: "Working…",
  ok: "Done",
  error: "Needs attention",
};

const STATUS_STYLE: Record<Status, string> = {
  idle: "bg-field text-muted",
  listening: "bg-brand-soft text-brand-ink",
  working: "bg-brand-soft text-brand-ink",
  ok: "bg-ok-soft text-ok",
  error: "bg-danger-soft text-danger",
};

type RecognitionResult = { transcript: string };
type RecognitionEvent = { results: ArrayLike<ArrayLike<RecognitionResult>> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): Recognition | null {
  const root = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = root.SpeechRecognition ?? root.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Brave ships the speech API but blocks the Google service behind it, so listening fails there. */
function isBrave(): boolean {
  const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
  return Boolean(nav.brave);
}

function opens(deviceType: string) {
  return deviceType === "door" || deviceType === "window" || deviceType === "curtain";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function findDevice(transcript: string, devices: Device[]) {
  const text = normalize(transcript);
  const compact = text.replace(/ /g, "");
  const ranked = [...devices].sort((a, b) => b.name.length - a.name.length);
  return ranked.find((device) => {
    const name = normalize(device.name);
    return text.includes(name) || compact.includes(name.replace(/ /g, ""));
  });
}

/** Reads the on/off intent from the words left over after the device name is removed. */
function wantedOn(transcript: string, deviceName: string): boolean | null {
  const rest = normalize(transcript).replace(normalize(deviceName), " ");
  const words = new Set(rest.split(" "));
  const off = ["off", "close", "shut", "disable"].some((word) => words.has(word));
  const on = ["on", "open", "enable", "start"].some((word) => words.has(word));
  if (off && !on) return false;
  if (on && !off) return true;
  return null;
}

export function VoicePanel({ devices, onChanged, onListeningChange }: Props) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const recognition = useRef<Recognition | null>(null);
  const devicesRef = useRef(devices);
  const onChangedRef = useRef(onChanged);

  // Recognition callbacks outlive a render, so they read the latest devices through refs.
  devicesRef.current = devices;
  onChangedRef.current = onChanged;

  const speechSupported = typeof window !== "undefined" && getRecognition() !== null;
  const braveBlocked = isBrave();

  useEffect(() => {
    return () => recognition.current?.stop();
  }, []);

  useEffect(() => {
    onListeningChange?.(listening);
  }, [listening, onListeningChange]);

  function speak(text: string) {
    setReply(text);
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
  }

  async function apply(transcript: string) {
    setStatus("working");
    const device = findDevice(transcript, devicesRef.current);
    if (!device) {
      speak("I could not find a device with that name.");
      setStatus("error");
      return;
    }
    const on = wantedOn(transcript, device.name);
    if (on === null) {
      speak(`Say on or off together with ${device.name}.`);
      setStatus("error");
      return;
    }
    const state = opens(device.device_type)
      ? { ...device.state, is_open: on }
      : { ...device.state, is_on: on };
    try {
      await api.put(`/devices/${device.id}/state`, { state });
      await onChangedRef.current();
      speak(`${device.name} ${on ? "on" : "off"}.`);
      setStatus("ok");
    } catch (error) {
      speak(errorMessage(error, "The device command failed."));
      setStatus("error");
    }
  }

  async function runTyped(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = typed.trim();
    if (!text) return;
    setHeard(text);
    await apply(text);
    setTyped("");
  }

  async function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setReply("The browser blocked the microphone. Allow it for this site in the address-bar lock icon, then press Listen again.");
      setStatus("error");
      return;
    }

    const next = getRecognition();
    if (!next) {
      setReply("This browser has no speech recognition. Use Chrome or Edge, or type the command below.");
      return;
    }

    next.lang = "en-US";
    next.interimResults = false;
    next.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setHeard(transcript);
      void apply(transcript);
    };
    next.onerror = (event) => {
      setStatus("error");
      if (event.error === "no-speech") {
        setReply("No speech was heard. Press Listen and speak again.");
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setReply("Speech recognition is blocked for this site.");
        return;
      }
      if (event.error === "network") {
        setReply(
          braveBlocked
            ? "Brave blocks the speech service this feature needs. Use Chrome or Edge for voice, or type the command below."
            : "The browser's speech service could not be reached. Check your internet connection, or type the command below.",
        );
        return;
      }
      setReply(`Speech error: ${event.error}. You can type the command below instead.`);
    };
    next.onend = () => {
      setListening(false);
      setStatus((current) => (current === "listening" ? "idle" : current));
    };
    recognition.current = next;
    next.start();
    setListening(true);
    setStatus("listening");
    setReply("Listening. Say turn on, then the device name.");
  }

  return (
    <section className="rounded-xl border border-line bg-card px-5 py-4 shadow-sm text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Voice</h2>
        <span role="status" aria-live="polite" className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
    
      {braveBlocked && (
        <p className="mt-2 rounded bg-warn-soft px-3 py-2 text-warn">
          You are using Brave, which blocks the speech service behind the Listen button. Voice works in Chrome or Edge.
          Typed commands work everywhere.
        </p>
      )}
      {!speechSupported && !braveBlocked && (
        <p className="mt-2 text-warn">This browser has no speech recognition. Typed commands still work.</p>
      )}

      <button
        className="mt-3 rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-1 disabled:opacity-50"
        disabled={!speechSupported}
        onClick={() => toggleMic().catch(() => setReply("Could not start listening."))}
      >
        {listening ? "Stop" : "Listen"}
      </button>

      <form onSubmit={(event) => void runTyped(event)} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg bg-field px-3 py-1"
          placeholder="e.g. turn on living room light"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button className="rounded-lg bg-field-strong text-ink hover:bg-line px-3 py-1" type="submit">Run</button>
      </form>

      {heard && <p className="mt-2">Heard: {heard}</p>}
      {reply && <p className="text-muted">{reply}</p>}
    </section>
  );
}
