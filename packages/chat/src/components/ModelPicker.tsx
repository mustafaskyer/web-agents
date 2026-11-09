import { useId } from "react";
import type { ModelChoice } from "../types";

const size = (bytes: number): string => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

/** Props of the model picker. */
export interface ModelPickerProps {
  models: readonly ModelChoice[];
  /** No switching mid-reply or mid-download. */
  disabled: boolean;
  onSelect(id: string): void;
}

/**
 * Which model an adapter runs (shown when it offers more than one): a native select, with the chosen model's brief,
 * size and whether it is already on this device underneath.
 */
export function ModelPicker({ models, disabled, onSelect }: ModelPickerProps) {
  const id = useId();
  const current = models.find((m) => m.selected) ?? models[0];
  if (!current) return null;
  const meta = [
    current.brief,
    current.bytes
      ? current.cached
        ? `${size(current.bytes)}, on this device`
        : `${size(current.bytes)} download`
      : current.cached
        ? "On this device"
        : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="wa-chat__model">
      <label htmlFor={id}>Model</label>
      <select id={id} value={current.id} disabled={disabled} aria-describedby={`${id}-meta`} onChange={(e) => onSelect(e.target.value)}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.recommended ? " (recommended)" : ""}
            {m.cached ? " · on this device" : ""}
          </option>
        ))}
      </select>
      <p id={`${id}-meta`} className="wa-chat__model-meta">
        {meta}
      </p>
    </div>
  );
}
