import { SORT_LABEL, SORTS, type SortKey } from "../data/flights";
import styles from "./SortBar.module.css";

/** Segmented sort control; toolname so the agent cursor presses it for sort_results. */
export function SortBar({ value, onChange }: { value: SortKey; onChange(by: SortKey): void }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, not a form fieldset
    <div className={styles.bar} role="group" aria-label="Sort by" toolname="sort_results">
      {SORTS.map((s) => (
        <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)}>
          {SORT_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
