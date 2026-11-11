import { airport, cheapest, type Flight, type FlightQuery, generateFlights } from "../data/flights";
import { addDays, todayIso } from "../lib/dates";
import { toResultsPath } from "../lib/search-params";

const ROUTES: [string, string][] = [
  ["LHR", "DXB"],
  ["JFK", "CDG"],
  ["SIN", "NRT"],
  ["CAI", "IST"],
  ["SFO", "ICN"],
  ["BER", "BOM"],
  ["GRU", "EZE"],
  ["CPT", "DOH"],
];

/** One featured route's card. */
export interface FeaturedRoute {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  /** Its results page. */
  path: string;
  /** The cheapest flight that day, if any. */
  best: Flight | undefined;
}

/**
 * The home page's featured routes: one-way economy for one adult, two weeks out, so the fares on the cards are real
 * searches a click away.
 *
 * Returns `date` (the day the fares are for) and `routes`.
 */
export function useFeaturedRoutes(): { date: string; routes: FeaturedRoute[] } {
  const date = addDays(todayIso(), 14);
  return {
    date,
    routes: ROUTES.map(([from, to]) => {
      const q: FlightQuery = { from, to, trip: "oneway", cabin: "economy", adults: 1, children: 0, infants: 0, date };
      return {
        from,
        to,
        fromCity: airport(from)?.city ?? from,
        toCity: airport(to)?.city ?? to,
        path: toResultsPath(q),
        best: cheapest(generateFlights(q)),
      };
    }),
  };
}
