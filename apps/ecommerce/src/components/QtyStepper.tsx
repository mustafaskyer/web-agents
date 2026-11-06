import styles from "./QtyStepper.module.css";
import { MinusIcon, PlusIcon } from "./icons";

export interface QtyStepperProps {
  value: number;
  onChange(value: number): void;
  max: number;
  /** Names the input for screen readers, e.g. "Quantity of Ocean Tee". */
  label?: string;
  /** Set inside a tool form, so the field becomes a tool parameter. */
  name?: string;
  paramDescription?: string;
}

export function QtyStepper({ value, onChange, max, label = "Quantity", name, paramDescription }: QtyStepperProps) {
  return (
    <div className={styles.stepper}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        <MinusIcon />
      </button>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        required
        aria-label={label}
        className="tabular"
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        toolparamdescription={paramDescription}
      />
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <PlusIcon />
      </button>
    </div>
  );
}
