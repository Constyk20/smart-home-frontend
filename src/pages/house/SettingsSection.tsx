import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { CARD, SectionTitle, type SectionProps } from "./shared";

export function SettingsSection({ house }: SectionProps) {
  const navigate = useNavigate();
  const sim = house.simulation;

  function signOut() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className={`${CARD} p-4 text-sm`}>
        <SectionTitle title="Simulation" hint="Drives the simulated temperature, humidity and light level." />
        <p className="text-ink-2">
          {sim ? (sim.simulation.is_running ? "Running" : "Paused") : "…"} · speed ×{sim?.simulation.speed ?? 1} ·{" "}
          {Math.round(sim?.simulation.simulated_seconds ?? 0)} simulated seconds
        </p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-ink" onClick={() => void house.controlSimulation("start")}>
            Start ×60
          </button>
          <button type="button" className="rounded-lg bg-field-strong px-4 py-2 font-medium text-ink hover:bg-line" onClick={() => void house.controlSimulation("pause")}>
            Pause
          </button>
        </div>
        {sim && (
          <p className="mt-3 text-xs text-muted">
            Light level {sim.environment.light_level} · every environment reading in this app is simulated.
          </p>
        )}
      </section>

      <section className={`${CARD} p-4 text-sm`}>
        <SectionTitle title="What is real and what is simulated" />
        <ul className="list-disc space-y-1 pl-5 text-ink-2">
          <li>Devices, rooms and their on/off state are stored by the backend. There is no hardware.</li>
          <li>Temperature, humidity and light level are simulated.</li>
          <li>Energy figures are estimates from rated wattage and logged runtime.</li>
          <li>Rules and schedules are fixed logic. The AI model is trained only on this house&apos;s logged history.</li>
          <li>Voice uses the browser&apos;s speech recognition plus name matching.</li>
        </ul>
      </section>

      <section className={`${CARD} p-4 text-sm`}>
        <SectionTitle title="Account" />
        <div className="flex flex-wrap gap-2">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-field-strong px-4 py-2 font-medium text-ink hover:bg-line">
            <Icon name="back" size={16} />
            All houses
          </Link>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2 font-medium text-danger hover:bg-danger-soft">
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
