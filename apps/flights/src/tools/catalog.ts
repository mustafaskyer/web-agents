/**
 * Skyline's WebTool catalog and where each tool is on:
 *
 *   global          get_booking, get_location
 *   results route   filter_results, sort_results, list_results, select_flight
 *
 * Declarative forms aren't in the catalog: they register by being on the page
 * (search_flights on home and results; fill_traveler_details and book_flight
 * on the booking page).
 */
import { RESULTS_PATTERN } from "../lib/searchParams";
import { filterResults, listResults } from "./filterResults";
import { getBooking } from "./getBooking";
import { getLocation } from "./getLocation";
import { selectFlight } from "./selectFlight";
import { sortResults } from "./sortResults";

export const catalog = [filterResults, sortResults, selectFlight, listResults, getBooking, getLocation];
export const globalTools = ["get_booking", "get_location"];
export const routeTools = { [RESULTS_PATTERN]: ["filter_results", "sort_results", "select_flight", "list_results"] };
