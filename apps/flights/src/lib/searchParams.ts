/**
 * A search lives in the URL: /flights/lhr/dxb/oneway/economy/1/0/0/2026-11-08?return=2026-11-15
 * Codes are lowercase in URLs and uppercase everywhere else. `checkQuery` is
 * shared by the URL loader and the search form, so both reject the same
 * inputs with the same words.
 */
import { AIRPORTS, type Airport, CABINS, type Cabin, type FlightQuery, TRIPS, type Trip } from "../data/flights";
import { isIsoDate, todayIso } from "./dates";

export const RESULTS_PATTERN = "/flights/:from/:to/:trip/:cabin/:adults/:children/:infants/:date";

/** "LHR", "lhr", "London", "London — LHR", "Heathrow (LHR)" → the airport. */
export function findAirport(input: string): Airport | undefined {
  const text = input.trim();
  const code = text.match(/\b([A-Za-z]{3})\)?$/)?.[1]?.toUpperCase();
  return (
    AIRPORTS.find((a) => a.code === code) ??
    AIRPORTS.find((a) => a.city.toLowerCase() === text.toLowerCase() || a.name.toLowerCase() === text.toLowerCase())
  );
}

function airportCode(input: string, field: string): string {
  if (!input.trim()) throw new Error(`Enter ${field === "from" ? "an origin" : "a destination"} airport.`);
  const found = findAirport(input);
  if (!found) throw new Error(`Unknown airport "${input.trim()}". Use a 3-letter code like LHR or DXB.`);
  return found.code;
}

function count(value: unknown, name: string, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error(`${name} must be a whole number from ${min} to ${max}, got ${String(value)}.`);
  return n;
}

type RawQuery = Partial<Record<keyof FlightQuery, unknown>>;

/** Validate and normalise a search. Throws a readable error: it's what the agent and the person see. */
export function checkQuery(raw: RawQuery, today = todayIso()): FlightQuery {
  const from = airportCode(String(raw.from ?? ""), "from");
  const to = airportCode(String(raw.to ?? ""), "to");
  if (from === to) throw new Error("Origin and destination are the same airport.");
  const trip = String(raw.trip || "oneway") as Trip;
  if (!TRIPS.includes(trip)) throw new Error(`Trip must be oneway or roundtrip, got "${trip}".`);
  const cabin = String(raw.cabin || "economy") as Cabin;
  if (!CABINS.includes(cabin)) throw new Error(`Cabin must be ${CABINS.join(", ")}; got "${cabin}".`);
  const adults = count(raw.adults ?? 1, "Adults", 1, 9);
  const children = count(raw.children || 0, "Children", 0, 8);
  const infants = count(raw.infants || 0, "Infants", 0, 9);
  if (infants > adults) throw new Error(`Each infant needs an adult on their lap: ${infants} infants, ${adults} adults.`);
  const date = String(raw.date ?? "");
  if (!isIsoDate(date)) throw new Error(`Departure date must be YYYY-MM-DD, got "${date}".`);
  if (date < today) throw new Error(`Date must be today (${today}) or later, got ${date}.`);
  const query: FlightQuery = { from, to, trip, cabin, adults, children, infants, date };
  if (trip === "roundtrip") {
    const back = String(raw.returnDate ?? "");
    if (!back) throw new Error("A round trip needs a returnDate (YYYY-MM-DD).");
    if (!isIsoDate(back)) throw new Error(`Return date must be YYYY-MM-DD, got "${back}".`);
    if (back < date) throw new Error(`Return date ${back} is before the departure ${date}.`);
    query.returnDate = back;
  }
  return query;
}

export function toResultsPath(q: FlightQuery): string {
  const path = ["/flights", q.from, q.to, q.trip, q.cabin, q.adults, q.children, q.infants, q.date].join("/").toLowerCase();
  return q.returnDate ? `${path}?return=${q.returnDate}` : path;
}

/** Route params + query string → a checked query. */
export function fromResultsParams(params: Record<string, string | undefined>, search: URLSearchParams, today?: string): FlightQuery {
  return checkQuery({ ...params, returnDate: search.get("return") ?? undefined }, today);
}
