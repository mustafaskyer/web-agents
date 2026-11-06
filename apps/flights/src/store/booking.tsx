/**
 * Search, selection and bookings. The search in progress (query, chosen
 * flight, typed details) lives in sessionStorage so a reload on the booking
 * page keeps it; confirmed bookings live in localStorage so get_booking works
 * later. Actions return a sentence for the agent and throw readable errors.
 *
 * Actions read and write a ref, not the render's state: an agent's calls in
 * quick succession must see each other's changes.
 */
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  airline,
  airlineCodes,
  applyFilters,
  cheapest,
  describeFlight,
  type Fare,
  type Filters,
  type Flight,
  type FlightQuery,
  fareFor,
  generateFlights,
  NO_FILTERS,
  type SortKey,
  sortFlights,
} from "../data/flights";
import { todayIso } from "../lib/dates";
import { toResultsPath } from "../lib/searchParams";

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
export interface Traveler {
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  dob: string;
  document: string;
}
export type TravelerKind = "Adult" | "Child" | "Infant";

export interface Booking {
  ref: string;
  query: FlightQuery;
  flight: Flight;
  contact: Contact;
  travelers: Traveler[];
  fare: Fare;
  bookedAt: number;
}

interface State {
  query: FlightQuery | null;
  filters: Filters;
  sort: SortKey;
  selectedId: string | null;
  contact: Contact;
  travelers: Traveler[];
  bookings: Booking[];
}

export interface BookingApi {
  query: FlightQuery | null;
  /** Every flight for the query. */
  results: Flight[];
  /** Filtered and sorted: what the page shows. */
  visible: Flight[];
  filters: Filters;
  sort: SortKey;
  selected: Flight | null;
  contact: Contact;
  travelers: Traveler[];
  bookings: Booking[];
  /** A new search resets filters, sort and the selection. */
  setQuery(q: FlightQuery): void;
  setFilters(filters: Partial<Filters>): string;
  setSort(by: SortKey): string;
  /** Throws for an id that isn't in the current results. */
  select(id: string): Flight;
  saveDetails(contact: Contact, travelers: Traveler[]): string;
  /** Field names (`lastName_2`, `email`) still empty. */
  missingDetails(): string[];
  /** The results and what the page shows, as of the latest action (not the last render). */
  view(): { results: Flight[]; visible: Flight[] };
  /** Throws when nothing is selected or details are missing. */
  confirm(): Booking;
  getBooking(ref: string): Booking | undefined;
}

const SESSION_KEY = "skyline:search";
const BOOKINGS_KEY = "skyline:bookings";
const EMPTY_CONTACT: Contact = { firstName: "", lastName: "", email: "", phone: "" };
const EMPTY_TRAVELER: Traveler = { firstName: "", lastName: "", dob: "", document: "" };

function read<T>(storage: Storage, key: string): T | null {
  try {
    return JSON.parse(storage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function load(): State {
  const session = read<Omit<State, "bookings">>(sessionStorage, SESSION_KEY);
  return {
    query: null,
    filters: NO_FILTERS,
    sort: "price-asc",
    selectedId: null,
    contact: EMPTY_CONTACT,
    travelers: [],
    ...session,
    bookings: read<Booking[]>(localStorage, BOOKINGS_KEY) ?? [],
  };
}

const travelerCount = (q: FlightQuery): number => q.adults + q.children + q.infants;

/** "Adult", "Adult", "Child", "Infant" for 2 adults, 1 child, 1 infant. */
export function travelerKinds(q: FlightQuery): TravelerKind[] {
  return [
    ...Array<TravelerKind>(q.adults).fill("Adult"),
    ...Array<TravelerKind>(q.children).fill("Child"),
    ...Array<TravelerKind>(q.infants).fill("Infant"),
  ];
}

const bookingRef = (): string =>
  `SK-${Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("")}`;

function summarize(visible: Flight[], total: number): string {
  if (visible.length === 0) return `No flights match (of ${total}). Loosen the filters.`;
  const names = [...new Set(visible.map((f) => airline(f.airline)?.name))].slice(0, 4).join(", ");
  return `Showing ${visible.length} of ${total} flights (${names}${visible.length > 4 ? ", …" : ""}). Cheapest: ${describeFlight(cheapest(visible)!)}.`;
}

const resultsOf = (s: State): Flight[] => (s.query ? generateFlights(s.query) : []);
const visibleOf = (s: State, results = resultsOf(s)): Flight[] => sortFlights(applyFilters(results, s.filters), s.sort);
function missingOf(s: State): string[] {
  const missing: string[] = (Object.keys(EMPTY_CONTACT) as (keyof Contact)[]).filter((k) => !s.contact[k].trim());
  const count = s.query ? travelerCount(s.query) : 0;
  for (let i = 0; i < count; i++) {
    const t = s.travelers[i] ?? EMPTY_TRAVELER;
    for (const k of Object.keys(EMPTY_TRAVELER) as (keyof Traveler)[]) if (!t[k].trim()) missing.push(`${k}_${i + 1}`);
  }
  return missing;
}

/** Stable across renders: they read and write the ref. */
type Actions = Pick<
  BookingApi,
  "setQuery" | "setFilters" | "setSort" | "select" | "saveDetails" | "missingDetails" | "view" | "confirm" | "getBooking"
>;

const BookingContext = createContext<BookingApi | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  const latest = useRef(state);

  const { bookings, ...search } = state;
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(search));
  });
  // confirm() also writes them at once; this covers anything else that changes them
  useEffect(() => {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings]);

  const actions = useMemo<Actions>(() => {
    const commit = (next: Partial<State>): State => {
      latest.current = { ...latest.current, ...next };
      setState(latest.current);
      return latest.current;
    };
    return {
      setQuery(q) {
        if (latest.current.query && toResultsPath(latest.current.query) === toResultsPath(q)) return;
        commit({ query: q, filters: NO_FILTERS, sort: "price-asc", selectedId: null, travelers: [] });
      },
      setFilters(filters) {
        if (!latest.current.query) throw new Error("Search for flights first (search_flights).");
        // names → codes (throws on an unknown airline before anything changes), so the sidebar's checkboxes agree
        const airlines = filters.airlines ? airlineCodes(filters.airlines) : latest.current.filters.airlines;
        const next = commit({ filters: { ...latest.current.filters, ...filters, airlines } });
        return summarize(visibleOf(next), resultsOf(next).length);
      },
      setSort(by) {
        if (!latest.current.query) throw new Error("Search for flights first (search_flights).");
        const visible = visibleOf(commit({ sort: by }));
        return visible[0]
          ? `Sorted ${visible.length} flights. First: ${describeFlight(visible[0])}.`
          : "Sorted. No flights match the filters.";
      },
      select(id) {
        const wanted = id.trim().toUpperCase();
        const flight = resultsOf(latest.current).find((f) => f.id === wanted);
        if (!flight) throw new Error(`No flight "${id}" in the current results. Use list_results for valid ids.`);
        commit({ selectedId: flight.id });
        return flight;
      },
      saveDetails(contact, travelers) {
        const next = commit({ contact, travelers });
        const missing = missingOf(next);
        const n = next.query ? travelerCount(next.query) : travelers.length;
        if (missing.length) return `Saved, but still missing: ${missing.join(", ")}.`;
        return `Saved details for ${n} traveler${n === 1 ? "" : "s"}. Next: book_flight (needs the user's confirmation).`;
      },
      missingDetails: () => missingOf(latest.current),
      view: () => {
        const results = resultsOf(latest.current);
        return { results, visible: visibleOf(latest.current, results) };
      },
      confirm() {
        const s = latest.current;
        const flight = resultsOf(s).find((f) => f.id === s.selectedId);
        if (!s.query || !flight) throw new Error("No flight selected. Use select_flight first.");
        // the search may come back from sessionStorage a day later
        if (s.query.date < todayIso()) throw new Error(`This flight left on ${s.query.date}. Search again for a later date.`);
        const missing = missingOf(s);
        if (missing.length) throw new Error(`Missing traveler details: ${missing.join(", ")}. Call fill_traveler_details first.`);
        const booking: Booking = {
          ref: bookingRef(),
          query: s.query,
          flight,
          contact: s.contact,
          travelers: s.travelers.slice(0, travelerCount(s.query)),
          fare: fareFor(s.query, flight),
          bookedAt: Date.now(),
        };
        const next = commit({ bookings: [...s.bookings, booking], selectedId: null, travelers: [], contact: EMPTY_CONTACT });
        // Now, not in the effect: the confirmation page may read storage first.
        localStorage.setItem(BOOKINGS_KEY, JSON.stringify(next.bookings));
        return booking;
      },
      getBooking: (ref) => latest.current.bookings.find((b) => b.ref === ref.trim().toUpperCase()),
    };
  }, []);

  const api = useMemo<BookingApi>(() => {
    const results = resultsOf(state);
    return {
      ...actions,
      query: state.query,
      results,
      visible: visibleOf(state, results),
      filters: state.filters,
      sort: state.sort,
      selected: results.find((f) => f.id === state.selectedId) ?? null,
      contact: state.contact,
      travelers: state.travelers,
      bookings: state.bookings,
    };
  }, [state, actions]);

  return <BookingContext.Provider value={api}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingApi {
  const booking = useContext(BookingContext);
  if (!booking) throw new Error("useBooking must be used inside <BookingProvider>");
  return booking;
}
