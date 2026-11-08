import { ActivityPanel } from "../../components/ActivityPanel";
import { AiPanel } from "../../components/AiPanel";
import { AutomationPanel } from "../../components/AutomationPanel";
import { SchedulePanel } from "../../components/SchedulePanel";
import { CARD, ScenesCard, SectionTitle, type SectionProps } from "./shared";

export function AutomationsSection({ house, houseId }: SectionProps) {
  return (
    <div className="space-y-4">
      <ScenesCard house={house} />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <AutomationPanel
            houseId={houseId}
            refreshKey={house.activityVersion}
            devices={house.devices.map((device) => ({ id: device.id, name: device.name }))}
          />
          <SchedulePanel
            houseId={houseId}
            devices={house.devices.map((device) => ({ id: device.id, name: device.name, device_type: device.device_type }))}
          />
        </div>
        <div className="space-y-4">
          <section className={`${CARD} p-4 text-sm`}>
            <SectionTitle title="Suggestions" hint="Each one is labelled: a fixed rule, or an estimate from the trained model." />
            <ul className="space-y-3">
              {house.advice.map((item) => (
                <li key={item.id} className="rounded-lg bg-field p-3">
                  <p className="font-medium text-ink">
                    {item.title}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.source === "ml" ? "bg-brand-soft text-brand-ink" : "bg-card text-ink-2"
                      }`}
                    >
                      {item.source === "ml" ? "ML estimate" : "Rule"}
                    </span>
                  </p>
                  <p className="mt-1 text-muted">{item.reason}</p>
                  <button
                    type="button"
                    className="mt-2 rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-ink"
                    onClick={() => void house.acceptSuggestion(item)}
                  >
                    Accept and apply
                  </button>
                </li>
              ))}
              {house.advice.length === 0 && <li className="text-muted">No suggestions for the current house.</li>}
            </ul>
          </section>
          <AiPanel houseId={houseId} onTrained={() => void house.load().catch(() => undefined)} />
          <ActivityPanel houseId={houseId} refreshKey={house.activityVersion} />
        </div>
      </div>
    </div>
  );
}
