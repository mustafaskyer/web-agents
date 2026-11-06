/**
 * Stops and airline filters. On wide screens a card beside the results; on
 * phones a bottom sheet behind a Filters button. Whichever is on screen carries
 * toolname="filter_results", so the agent cursor goes there.
 */
import { useEffect, useId, useRef, useState } from "react";
import { AIRLINES, type Filters, type Flight, type StopsFilter } from "../data/flights";
import { useMediaQuery } from "../lib/useMediaQuery";
import styles from "./FiltersSidebar.module.css";
import { CloseIcon, FilterIcon } from "./icons";

interface Props {
  results: readonly Flight[];
  filters: Filters;
  onChange(filters: Partial<Filters>): void;
}

const STOPS: { value: StopsFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: 0, label: "Direct" },
  { value: 1, label: "1 stop" },
  { value: 2, label: "2 stops" },
];

function FiltersPanel({ results, filters, onChange }: Props) {
  const name = useId();
  const carriers = AIRLINES.map((a) => ({ ...a, count: results.filter((f) => f.airline === a.code).length })).filter((a) => a.count > 0);
  const toggle = (code: string, on: boolean) =>
    onChange({ airlines: on ? [...filters.airlines, code] : filters.airlines.filter((c) => c !== code) });

  return (
    <>
      <fieldset className={styles.group}>
        <legend className="label">Stops</legend>
        {STOPS.map((s) => {
          const count = s.value === "any" ? results.length : results.filter((f) => f.stops === s.value).length;
          return (
            <label key={s.label} className={styles.option}>
              <input type="radio" name={name} checked={filters.stops === s.value} onChange={() => onChange({ stops: s.value })} />
              <span>{s.label}</span>
              <span className={`${styles.count} tabular`}>{count}</span>
            </label>
          );
        })}
      </fieldset>
      <fieldset className={styles.group}>
        <legend className="label">Airlines</legend>
        {carriers.map((a) => (
          <label key={a.code} className={styles.option}>
            <input type="checkbox" checked={filters.airlines.includes(a.code)} onChange={(e) => toggle(a.code, e.target.checked)} />
            <span>{a.name}</span>
            <span className={`${styles.count} tabular`}>{a.count}</span>
          </label>
        ))}
      </fieldset>
      {(filters.stops !== "any" || filters.airlines.length > 0) && (
        <button type="button" className="btn outline block" onClick={() => onChange({ stops: "any", airlines: [] })}>
          Clear filters
        </button>
      )}
    </>
  );
}

export function FiltersSidebar(props: Props) {
  const phone = useMediaQuery("(max-width: 899px)");
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = (props.filters.stops !== "any" ? 1 : 0) + props.filters.airlines.length;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  if (!phone) {
    return (
      <aside className={`card ${styles.sidebar}`} aria-label="Filters" toolname="filter_results">
        <h2 className={styles.title}>Filters</h2>
        <FiltersPanel {...props} />
      </aside>
    );
  }

  return (
    <>
      <button type="button" className="btn outline" onClick={() => setOpen(true)} toolname={open ? undefined : "filter_results"}>
        <FilterIcon />
        Filters{active > 0 && <span className="tabular"> ({active})</span>}
      </button>
      {open && (
        <div className={styles.sheetRoot}>
          <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.sheet} toolname="filter_results">
            <div className={styles.sheetHead}>
              <h2 id={titleId} className={styles.title}>
                Filters
              </h2>
              <button ref={closeRef} type="button" className="icon-btn" aria-label="Close filters" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <FiltersPanel {...props} />
            <button type="button" className="btn primary block" onClick={() => setOpen(false)}>
              Show {props.results.length ? "results" : "flights"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
