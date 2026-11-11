import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../api";

type DeviceState = { is_on?: boolean; is_open?: boolean; brightness?: number; target_temp?: number; speed?: number };
export type VoiceDevice = { id: string; name: string; device_type: string; state: DeviceState };

export type VoiceStatus = "idle" | "listening" | "working" | "ok" | "error";

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
  return Boolean((navigator as Navigator & { brave?: unknown }).brave);
}

function opens(deviceType: string) {
  return deviceType === "door" || deviceType === "window" || deviceType === "curtain";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function findDevice(transcript: string, devices: VoiceDevice[]) {
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

/**
 * One voice-command engine for the whole page, so the header button and the Home AI orb
 * share the same microphone, status and replies.
 */
export function useVoice(devices: VoiceDevice[], onChanged: () => Promise<void> | void) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const recognition = useRef<Recognition | null>(null);
  const devicesRef = useRef(devices);
  const onChangedRef = useRef(onChanged);

  // Recognition callbacks outlive a render, so they read the latest values through refs.
  devicesRef.current = devices;
  onChangedRef.current = onChanged;

  const speechSupported = typeof window !== "undefined" && getRecognition() !== null;
  const braveBlocked = typeof navigator !== "undefined" && isBrave();

  useEffect(() => () => recognition.current?.stop(), []);

  const speak = useCallback((text: string) => {
    setReply(text);
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
  }, []);

  const apply = useCallback(
    async (transcript: string) => {
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
      const state = opens(device.device_type) ? { ...device.state, is_open: on } : { ...device.state, is_on: on };
      try {
        await api.put(`/devices/${device.id}/state`, { state });
        await onChangedRef.current();
        speak(`${device.name} ${on ? "on" : "off"}.`);
        setStatus("ok");
      } catch (error) {
        speak(errorMessage(error, "The device command failed."));
        setStatus("error");
      }
    },
    [speak],
  );

  const runText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setHeard(clean);
      await apply(clean);
    },
    [apply],
  );

  const toggleMic = useCallback(async () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setReply("The browser blocked the microphone. Allow it for this site in the address-bar lock icon, then try again.");
      setStatus("error");
      return;
    }

    const next = getRecognition();
    if (!next) {
      setReply("This browser has no speech recognition. Use Chrome or Edge, or type the command.");
      setStatus("error");
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
      if (event.error === "no-speech") setReply("No speech was heard. Tap the mic and speak again.");
      else if (event.error === "not-allowed" || event.error === "service-not-allowed") setReply("Speech recognition is blocked for this site.");
      else if (event.error === "network")
        setReply(
          braveBlocked
            ? "Brave blocks the speech service this feature needs. Use Chrome or Edge for voice, or type the command."
            : "The browser's speech service could not be reached. Check your internet connection, or type the command.",
        );
      else setReply(`Speech error: ${event.error}. You can type the command instead.`);
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
  }, [listening, apply, braveBlocked]);

  return { listening, heard, reply, status, speechSupported, braveBlocked, toggleMic, runText };
}

export type VoiceApi = ReturnType<typeof useVoice>;
