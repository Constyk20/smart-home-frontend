import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onCommit: (value: number) => Promise<void> | void;
  disabled?: boolean;
};

/**
 * Shows the value while dragging but only sends it to the server when the user lets go,
 * so one drag is one request instead of dozens. If the update fails it snaps back to the server value.
 */
export function Slider({ label, value, min, max, unit, onCommit, disabled }: Props) {
  const [local, setLocal] = useState(value);
  const sent = useRef(value);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    setLocal(value);
    sent.current = value;
  }, [value]);

  function commit() {
    if (local === sent.current) return;
    sent.current = local;
    void Promise.resolve(onCommit(local)).finally(() => {
      setLocal(latest.current);
      sent.current = latest.current;
    });
  }

  return (
    <label className="block text-xs text-muted">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-medium text-ink">
          {local}
          {unit}
        </span>
      </span>
      <input
        className="mt-1 w-full"
        type="range"
        min={min}
        max={max}
        value={local}
        disabled={disabled}
        onChange={(event) => setLocal(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
