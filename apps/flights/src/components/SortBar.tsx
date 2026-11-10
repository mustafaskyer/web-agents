import { SORT_LABEL, SORTS, type SortKey } from "../data/flights";
import styles from "./SortBar.module.css";

/** Segmented sort control. sort_results presses the button named like the sort ("Price: high to low"). */
export function SortBar({ value, onChange }: { value: SortKey; onChange(by: SortKey): void }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a group of toggle buttons, not a form fieldset
    <div className={styles.bar} role="group" aria-label="Sort by">
      {SORTS.map((s) => (
        <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)}>
          {SORT_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
