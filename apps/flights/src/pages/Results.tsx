import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { FlightCard, FlightCardSkeleton } from "../components/FlightCard";
import { SortBar } from "../components/SortBar";
import { airport, CABIN_LABEL, type FlightQuery } from "../data/flights";
import { formatDate } from "../lib/dates";
import { travelersText } from "../lib/itinerary";
import { LATENCY_MS } from "../lib/latency";
import { toResultsPath } from "../lib/searchParams";
import { useTitle } from "../lib/useTitle";
import { useBooking } from "../store/booking";
import { SearchFlightsForm } from "../tools/SearchFlightsForm";
import styles from "./Results.module.css";

export function Results() {
  const q = useLoaderData() as FlightQuery;
  const booking = useBooking();
  const navigate = useNavigate();
  const key = toResultsPath(q);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const from = airport(q.from)?.city ?? q.from;
  const to = airport(q.to)?.city ?? q.to;
  useTitle(`${from} → ${to}`);

  const { setQuery } = booking;
  useEffect(() => {
    setQuery(q);
    const timer = setTimeout(() => setLoadedKey(key), LATENCY_MS);
    return () => clearTimeout(timer);
  }, [key, q, setQuery]);

  // the effect stores the query before it starts the timer, so "loaded" means the store has it too
  const ready = loadedKey === key;
  const { visible, results } = booking;

  return (
    <div className="page">
      <div className={`card ${styles.search}`}>
        {/* keyed: Back / a new search re-seeds the fields from the URL */}
        <SearchFlightsForm key={key} initial={q} compact />
      </div>

      <div className={styles.summary}>
        <h1>
          {from} <span aria-hidden="true">✈</span>
          <span className="visually-hidden">to</span> {to}
        </h1>
        <p className="muted tabular" aria-live="polite">
          {ready ? `${visible.length} of ${results.length} flights` : "Searching…"} · {formatDate(q.date, { year: false })}
          {q.returnDate && ` – ${formatDate(q.returnDate, { year: false })}`} · {travelersText(q)} · {CABIN_LABEL[q.cabin]}
        </p>
      </div>

      <div className={styles.layout}>
        <FiltersSidebar results={ready ? results : []} filters={booking.filters} onChange={booking.setFilters} />
        <div className={styles.main}>
          <SortBar value={booking.sort} onChange={booking.setSort} />
          <div className={styles.list} aria-busy={!ready}>
            {!ready ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
              Array.from({ length: 4 }, (_, i) => <FlightCardSkeleton key={i} />)
            ) : visible.length === 0 ? (
              <EmptyState
                title="No flights match these filters"
                body={`${results.length} flights are hidden by the stops or airline filters.`}
                action={
                  <button type="button" className="btn primary" onClick={() => booking.setFilters({ stops: "any", airlines: [] })}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              visible.map((f) => (
                <FlightCard
                  key={f.id}
                  flight={f}
                  query={q}
                  onSelect={() => {
                    booking.select(f.id);
                    void navigate("/flights/booking");
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
