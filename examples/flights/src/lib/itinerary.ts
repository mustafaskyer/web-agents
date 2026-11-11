import {
  airline,
  airport,
  arrivalDayOffset,
  CABIN_LABEL,
  clock,
  describeFlight,
  durationText,
  type Flight,
  type FlightQuery,
  money,
} from "../data/flights";
import type { Booking } from "../store/booking";
import { formatDate } from "./dates";

/** "Meridian" for MR; the code itself for an airline we don't know. */
export const airlineName = (code: string): string => airline(code)?.name ?? code;

/** The airline's brand colour, for its badge. */
export const airlineColor = (code: string): string | undefined => airline(code)?.color;

/** "London (LHR) → Dubai (DXB)" */
export const routeText = (q: Pick<FlightQuery, "from" | "to">): string =>
  `${airport(q.from)?.city} (${q.from}) → ${airport(q.to)?.city} (${q.to})`;

export const travelersText = (q: FlightQuery): string =>
  [
    `${q.adults} adult${q.adults === 1 ? "" : "s"}`,
    q.children ? `${q.children} child${q.children === 1 ? "" : "ren"}` : "",
    q.infants ? `${q.infants} infant${q.infants === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(", ");

/** Times on the departure day, e.g. "Sun, 8 Nov 2026, 07:30 → 11:30 (+1)". */
export function timesText(q: FlightQuery, f: Flight): string {
  const offset = arrivalDayOffset(f);
  return `${formatDate(q.date)}, ${clock(f.departMin)} → ${clock(f.departMin + f.durationMin)}${offset ? ` (+${offset})` : ""}`;
}

/** What get_booking answers. */
export function itineraryText(b: Booking): string {
  const q = b.query;
  return [
    `Booking ${b.ref}: confirmed.`,
    `${routeText(q)}, ${q.trip === "roundtrip" ? `round trip, returning ${formatDate(q.returnDate ?? q.date)}` : "one way"}.`,
    `${describeFlight(b.flight)}; ${CABIN_LABEL[q.cabin]}; ${timesText(q, b.flight)}; ${durationText(b.flight.durationMin)}.`,
    `Travelers: ${b.travelers.map((t) => `${t.firstName} ${t.lastName}`).join(", ")} (${travelersText(q)}).`,
    `Contact: ${b.contact.email}. Total paid: ${money(b.fare.total)}.`,
  ].join("\n");
}
