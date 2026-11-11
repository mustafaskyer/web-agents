/**
 * Skyline's catalog: the provider's `tools` (`<WebAgentsProvider tools={tools}>` in src/root.tsx). Plain modules with
 * no React: they read the booking store (src/store/booking.ts) and navigate with the router (src/lib/navigate.ts), so
 * the provider passes them nothing, and agents.ts, which lists them, is read on the server (api/chat.ts, the Vite dev
 * plugin).
 *
 * Every tool of the app, and when it is on:
 *
 * | Tool                  | Where                                                       | On                         |
 * |-----------------------|-------------------------------------------------------------|----------------------------|
 * | get_time              | @webmcp-agents/tools `getTime` (this catalog)               | everywhere                 |
 * | get_location          | tools/get-location.ts (this catalog)                        | everywhere                 |
 * | get_booking           | tools/get-booking.ts (this catalog)                         | everywhere                 |
 * | filter_results        | tools/filter-results.ts (this catalog, `match`)             | a results page             |
 * | sort_results          | tools/sort-results.ts (this catalog, `match`)               | a results page             |
 * | list_results          | tools/list-results.ts (this catalog, `match`)               | a results page             |
 * | select_flight         | tools/select-flight.ts (this catalog, `match`)              | a results page             |
 * | search_flights        | hooks/use-search-flights.ts (`useWebTool`, React Hook Form) | the home and results pages |
 * | fill_traveler_details | hooks/use-traveler-details.ts (`useWebTool`, TanStack Form) | the booking page           |
 * | book_flight           | hooks/use-book-flight.ts (`useWebTool`, React Hook Form)    | the booking page           |
 *
 * The three form tools' hooks are called by the forms that render their fields (src/components/search-flights-form.tsx,
 * traveler-details-form.tsx, book-flight-form.tsx).
 */
import { getTime } from "@webmcp-agents/tools";
import { filterResults } from "./filter-results";
import { getBooking } from "./get-booking";
import { getLocation } from "./get-location";
import { listResults } from "./list-results";
import { selectFlight } from "./select-flight";
import { sortResults } from "./sort-results";

export const tools = {
  // Common tools, ready-made: Skyline's description says dates go to search_flights as YYYY-MM-DD.
  getTime: getTime({
    description:
      "The user's current date, time and time zone, and the dates of tomorrow, this weekend, next week and the next 14 days by weekday. Use whenever the user gives a relative date (today, tomorrow, this weekend, next Friday, next week, in 3 days) before searching: never guess today's date. Next: search_flights with date as YYYY-MM-DD.",
  }),

  // Skyline's own.
  getLocation,
  getBooking,
  filterResults,
  sortResults,
  listResults,
  selectFlight,
};

/**
 * What /api/chat lets the model see (api/chat.ts, the Vite dev plugin): the catalog, pinned (the server sends the
 * model these descriptions, whatever a request says), and the forms' inline tools by id. A tool not listed here
 * never reaches the model.
 */
export const allowedTools = [...Object.values(tools), "search_flights", "fill_traveler_details", "book_flight"];
