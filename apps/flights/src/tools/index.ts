/**
 * Skyline's app-wide tools, defined once at module level. They read the booking store directly (src/store) and
 * navigate with the router (src/lib/navigate.ts), so the provider passes them nothing. Where each one is on comes from
 * its own definition:
 *
 *   everywhere          get_booking, get_location, get_time (from @webmcp-agents/tools)
 *   a results page      filter_results, sort_results, list_results, select_flight (`match`)
 *
 * The forms live in the components that own them (`useWebTool`), on while they are mounted: search_flights (home and
 * results), fill_traveler_details and book_flight (the booking page).
 */
import { getTime } from "@webmcp-agents/tools";
import { filterResults, listResults } from "./filterResults";
import { getBooking } from "./getBooking";
import { getLocation } from "./getLocation";
import { selectFlight } from "./selectFlight";
import { sortResults } from "./sortResults";

export const tools = {
  getTime: getTime({
    description:
      "The user's current date, time and time zone, and the dates of tomorrow, this weekend, next week and the next 14 days by weekday. Use whenever the user gives a relative date (today, tomorrow, this weekend, next Friday, next week, in 3 days) before searching: never guess today's date. Next: search_flights with date as YYYY-MM-DD.",
  }),
  getLocation,
  getBooking,
  filterResults,
  sortResults,
  listResults,
  selectFlight,
};
