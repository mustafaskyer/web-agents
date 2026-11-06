/**
 * Mock flight data: a deterministic generator keyed on the search, plus pure
 * filters and sorts. Same query → same flights, on every machine and reload,
 * so an agent's flight ids stay valid. No React, no DOM (node-tested).
 */
import airlinesJson from "./airlines.json";
import airportsJson from "./airports.json";

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
  /** Longitude: drives the made-up flight durations. */
  lon: number;
}
export interface Airline {
  code: string;
  name: string;
  color: string;
}

export const AIRPORTS: readonly Airport[] = airportsJson;
export const AIRLINES: readonly Airline[] = airlinesJson;

export const TRIPS = ["oneway", "roundtrip"] as const;
export const CABINS = ["economy", "premium", "business", "first"] as const;
export type Trip = (typeof TRIPS)[number];
export type Cabin = (typeof CABINS)[number];
export const CABIN_LABEL: Record<Cabin, string> = { economy: "Economy", premium: "Premium economy", business: "Business", first: "First" };

export interface FlightQuery {
  from: string;
  to: string;
  trip: Trip;
  cabin: Cabin;
  adults: number;
  children: number;
  infants: number;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD, round trips only. */
  returnDate?: string;
}

export interface Flight {
  /** Stable for the query, e.g. F-3K2. */
  id: string;
  airline: string;
  flightNo: string;
  /** Minutes after local midnight. */
  departMin: number;
  durationMin: number;
  stops: 0 | 1 | 2;
  stopCodes: string[];
  cabin: Cabin;
  /** Cents, per adult. */
  price: number;
  seatsLeft: number;
}

export type StopsFilter = "any" | 0 | 1 | 2;
export interface Filters {
  stops: StopsFilter;
  /** Airline codes; empty = all. */
  airlines: string[];
}
export const SORTS = ["price-asc", "price-desc", "duration", "depart"] as const;
export type SortKey = (typeof SORTS)[number];
export const SORT_LABEL: Record<SortKey, string> = {
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  duration: "Shortest",
  depart: "Earliest",
};
export const NO_FILTERS: Filters = { stops: "any", airlines: [] };

// ---------- seeded randomness ----------

/** 32-bit FNV-1a. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tiny seeded PRNG: floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- generator ----------

const CABIN_FACTOR: Record<Cabin, number> = { economy: 1, premium: 1.6, business: 3.2, first: 5.5 };

export const airport = (code: string): Airport | undefined => AIRPORTS.find((a) => a.code === code.toUpperCase());
export const airline = (code: string): Airline | undefined => AIRLINES.find((a) => a.code === code);

const cache = new Map<string, Flight[]>();

/**
 * The flights for a search (outbound only; a round trip's fare includes the return).
 * Cached per search: pages, tools and the store all ask for the same list. Don't mutate it.
 */
export function generateFlights(q: FlightQuery): Flight[] {
  const key = [q.from, q.to, q.date, q.cabin, q.trip].join("|").toUpperCase();
  let flights = cache.get(key);
  if (!flights) {
    if (cache.size >= 64) cache.clear();
    flights = build(q, key);
    cache.set(key, flights);
  }
  return flights;
}

function build(q: FlightQuery, seed: string): Flight[] {
  const from = airport(q.from);
  const to = airport(q.to);
  if (!from || !to) return [];
  const rand = mulberry32(hash(seed));
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;

  const span = Math.abs(from.lon - to.lon);
  const directMin = Math.round(60 + Math.min(span, 360 - span) * 8.5);
  const baseFare = 6000 + directMin * 18;
  const count = 24 + Math.floor(rand() * 37);
  const vias = AIRPORTS.filter((a) => a.code !== from.code && a.code !== to.code);
  const ids = new Set<string>();

  const flights: Flight[] = [];
  for (let i = 0; i < count; i++) {
    const stops = (rand() < 0.35 ? 0 : rand() < 0.75 ? 1 : 2) as 0 | 1 | 2;
    const layovers = Array.from({ length: stops }, () => 50 + Math.floor(rand() * 180));
    const durationMin = directMin + layovers.reduce((n, m) => n + m, 0) + Math.floor(rand() * 40);
    const carrier = pick(AIRLINES);
    const fare = baseFare * CABIN_FACTOR[q.cabin] * (q.trip === "roundtrip" ? 1.8 : 1) * (0.75 + rand() * 0.7) * (1 - stops * 0.12);
    let id: string;
    do
      id = `F-${Math.floor(rand() * 36 ** 3)
        .toString(36)
        .toUpperCase()
        .padStart(3, "0")}`;
    while (ids.has(id));
    ids.add(id);
    flights.push({
      id,
      airline: carrier.code,
      flightNo: `${carrier.code} ${100 + Math.floor(rand() * 900)}`,
      departMin: (5 * 60 + Math.floor(rand() * 18 * 12) * 5) % (24 * 60),
      durationMin,
      stops,
      stopCodes: Array.from({ length: stops }, () => pick(vias).code),
      cabin: q.cabin,
      price: Math.round(fare / 10) * 10,
      seatsLeft: 1 + Math.floor(rand() * 9),
    });
  }
  return flights;
}

// ---------- filters and sorts ----------

/** Codes for airline names or codes, case-insensitive. Throws naming the ones it doesn't know. */
export function airlineCodes(names: readonly string[]): string[] {
  const unknown: string[] = [];
  const codes = names.map((n) => {
    const key = n.trim().toLowerCase();
    const match = AIRLINES.find((a) => a.code.toLowerCase() === key || a.name.toLowerCase() === key);
    if (!match) unknown.push(n);
    return match?.code ?? "";
  });
  if (unknown.length)
    throw new Error(
      `Unknown airline${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Known: ${AIRLINES.map((a) => a.name).join(", ")}.`,
    );
  return codes;
}

export function applyFilters(flights: readonly Flight[], filters: Partial<Filters>): Flight[] {
  const { stops = "any", airlines = [] } = filters;
  const codes = airlines.length ? new Set(airlineCodes(airlines)) : null;
  return flights.filter((f) => (stops === "any" || f.stops === stops) && (!codes || codes.has(f.airline)));
}

export function sortFlights(flights: readonly Flight[], by: SortKey): Flight[] {
  const cmp: Record<SortKey, (a: Flight, b: Flight) => number> = {
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    duration: (a, b) => a.durationMin - b.durationMin,
    depart: (a, b) => a.departMin - b.departMin,
  };
  return flights.toSorted((a, b) => cmp[by](a, b) || a.id.localeCompare(b.id));
}

/** The lowest fare, or undefined for no flights. */
export const cheapest = (flights: readonly Flight[]): Flight | undefined =>
  flights.reduce<Flight | undefined>((best, f) => (!best || f.price < best.price ? f : best), undefined);

// ---------- formatting ----------

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "code" });
/** `16110` → `USD 161.10`. */
export const money = (cents: number): string => usd.format(cents / 100).replace(/ /, " ");

/** `450` → `07:30`. */
export const clock = (min: number): string => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
/** Days after the departure day the flight lands: 0, 1 or 2. */
export const arrivalDayOffset = (f: Flight): number => Math.floor((f.departMin + f.durationMin) / 1440);
export const durationText = (min: number): string => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
export const stopsText = (f: Flight): string =>
  f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""} · ${f.stopCodes.join(", ")}`;

/** "Meridian MR 214, 07:30→11:30 (direct, 4h 00m), USD 161.10 [id F-3K2]": one result line for the agent. */
export function describeFlight(f: Flight): string {
  const offset = arrivalDayOffset(f);
  const stops = f.stops === 0 ? "direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""} via ${f.stopCodes.join(", ")}`;
  return `${airline(f.airline)?.name} ${f.flightNo}, ${clock(f.departMin)}→${clock(f.departMin + f.durationMin)}${offset ? ` (+${offset})` : ""} (${stops}, ${durationText(f.durationMin)}), ${money(f.price)} [id ${f.id}]${f.seatsLeft <= 3 ? `, ${f.seatsLeft} seats left` : ""}`;
}

// ---------- fares ----------

export const TAX_RATE = 0.12;
/** Infants fly on a lap for 10% of the fare. */
export const INFANT_RATE = 0.1;

export interface Fare {
  seats: number;
  base: number;
  taxes: number;
  total: number;
}

export function fareFor(q: Pick<FlightQuery, "adults" | "children" | "infants">, f: Pick<Flight, "price">): Fare {
  const base = f.price * (q.adults + q.children) + Math.round(f.price * INFANT_RATE) * q.infants;
  const taxes = Math.round(base * TAX_RATE);
  return { seats: q.adults + q.children, base, taxes, total: base + taxes };
}
