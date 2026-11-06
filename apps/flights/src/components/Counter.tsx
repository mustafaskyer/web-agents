import styles from "./Counter.module.css";
import { MinusIcon, PlusIcon } from "./icons";

export interface CounterProps {
  name: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
  paramDescription: string;
}

/** A labelled number field with −/+ buttons. The input is the real (agent-fillable) field. */
export function Counter({ name, label, hint, value, min, max, onChange, paramDescription }: CounterProps) {
  return (
    <div className={styles.counter}>
      <label htmlFor={`count-${name}`}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </label>
      <div className={styles.controls}>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <MinusIcon />
        </button>
        <input
          id={`count-${name}`}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          className="tabular"
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          toolparamdescription={paramDescription}
        />
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}
