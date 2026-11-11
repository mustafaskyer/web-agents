import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { AIRLINES, airport, type Flight, type FlightQuery, type SortKey, type StopsFilter } from "../data/flights";
import { LATENCY_MS } from "../lib/latency";
import { toResultsPath } from "../lib/search-params";
import { useBooking } from "./use-booking";

/** One stops radio: `param` is the value filter_results' `stops` parameter takes for it (the radio's value). */
export interface StopsOption {
  value: StopsFilter;
  param: string;
  label: string;
  count: number;
  checked: boolean;
}

/** One airline checkbox, for an airline that flies this search. */
export interface AirlineOption {
  code: string;
  name: string;
  color: string;
  count: number;
  checked: boolean;
}

/** What the filters sidebar shows and does. */
export interface FiltersView {
  stops: StopsOption[];
  airlines: AirlineOption[];
  /** How many filters are on (the phone's "Filters (2)"). */
  active: number;
  /** Flights the filters choose from (0 while searching). */
  total: number;
  setStops(stops: StopsFilter): void;
  toggleAirline(code: string, on: boolean): void;
  clear(): void;
}

const STOPS: Pick<StopsOption, "value" | "param" | "label">[] = [
  { value: "any", param: "any", label: "Any" },
  { value: 0, param: "0", label: "Direct" },
  { value: 1, param: "1", label: "1 stop" },
  { value: 2, param: "2", label: "2 stops" },
];

/**
 * A results page: the search from the URL (the route's loader), stored so the results tools see it, then the results
 * after the pretend latency (`?latency=0` turns it off).
 *
 * Returns the `query` and its `key` (its URL: a new search re-seeds the search form), the cities (`from`, `to`),
 * `ready` (false while "searching"), the `total` and the `visible` flights (filtered, sorted), the `sort` and
 * `setSort`, the sidebar's `filters`, and `select` (choose a flight, open the booking page).
 */
export function useResults() {
  const query = useLoaderData() as FlightQuery;
  const booking = useBooking();
  const navigate = useNavigate();
  const key = toResultsPath(query);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const { setQuery, setFilters } = booking;
  useEffect(() => {
    setQuery(query);
    const timer = setTimeout(() => setLoadedKey(key), LATENCY_MS);
    return () => clearTimeout(timer);
  }, [key, query, setQuery]);

  // the effect stores the query before it starts the timer, so "loaded" means the store has it too
  const ready = loadedKey === key;
  const results = ready ? booking.results : [];
  const { filters } = booking;

  const filtersView: FiltersView = {
    stops: STOPS.map((s) => ({
      ...s,
      count: s.value === "any" ? results.length : results.filter((f) => f.stops === s.value).length,
      checked: filters.stops === s.value,
    })),
    airlines: AIRLINES.map((a) => ({
      code: a.code,
      name: a.name,
      color: a.color,
      count: results.filter((f) => f.airline === a.code).length,
      checked: filters.airlines.includes(a.code),
    })).filter((a) => a.count > 0),
    active: (filters.stops !== "any" ? 1 : 0) + filters.airlines.length,
    total: results.length,
    setStops: (stops) => setFilters({ stops }),
    toggleAirline: (code, on) => setFilters({ airlines: on ? [...filters.airlines, code] : filters.airlines.filter((c) => c !== code) }),
    clear: () => setFilters({ stops: "any", airlines: [] }),
  };

  return {
    query,
    key,
    from: airport(query.from)?.city ?? query.from,
    to: airport(query.to)?.city ?? query.to,
    ready,
    total: booking.results.length,
    visible: booking.visible,
    sort: booking.sort,
    setSort: (by: SortKey) => void booking.setSort(by),
    filters: filtersView,
    select: (flight: Flight) => {
      booking.select(flight.id);
      void navigate("/flights/booking");
    },
  };
}
