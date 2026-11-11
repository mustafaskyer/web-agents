import type { KeyboardEvent } from "react";
import { useAdapterStatus } from "../session/use-adapter-status";
import type { AdapterStatus, AgentAdapter } from "../types";

const DOT: Record<AdapterStatus["state"], string> = {
  ready: "ready",
  loading: "pending",
  "needs-download": "pending",
  downloading: "pending",
  unavailable: "off",
  error: "off",
};

function Option({
  adapter,
  selected,
  disabled,
  onSelect,
}: {
  adapter: AgentAdapter;
  selected: boolean;
  disabled: boolean;
  onSelect(): void;
}) {
  const status = useAdapterStatus(adapter);
  const off = status.state === "unavailable";
  return (
    // biome-ignore lint/a11y/useSemanticElements: a segmented control; the radio group's arrow keys are handled by the group
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      disabled={disabled || (off && !selected)}
      title={off ? status.reason : undefined}
      className="wa-chat__switch"
      onClick={onSelect}
    >
      <span className="wa-chat__dot" data-state={DOT[status.state]} aria-hidden="true" />
      {adapter.label}
    </button>
  );
}

/** Which assistant answers: a segmented radio group (arrow keys move between options). */
export function AdapterSwitcher({
  adapters,
  value,
  disabled,
  onChange,
}: {
  adapters: readonly AgentAdapter[];
  value: string;
  disabled: boolean;
  onChange(id: string): void;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    // the next option that can be chosen: unavailable assistants are skipped, as they are for the mouse
    const radios = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const step = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const at = adapters.findIndex((a) => a.id === value);
    for (let i = 1; i < radios.length; i++) {
      const next = (at + step * i + radios.length) % radios.length;
      if (radios[next]?.disabled) continue;
      onChange(adapters[next]!.id);
      radios[next]!.focus();
      return;
    }
  }
  return (
    <div className="wa-chat__switcher" role="radiogroup" aria-label="Assistant" onKeyDown={onKeyDown}>
      {adapters.map((a) => (
        <Option key={a.id} adapter={a} selected={a.id === value} disabled={disabled} onSelect={() => onChange(a.id)} />
      ))}
    </div>
  );
}
