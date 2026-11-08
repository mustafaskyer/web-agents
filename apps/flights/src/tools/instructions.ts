/**
 * What the on-device model is told about Skyline (createLocalAdapter's `instructions`): the booking flow in order,
 * which a small model can't infer from tool names.
 */
export const SKYLINE_INSTRUCTIONS = `Skyline books flights in this order: search_flights (from, to, date, travelers), then list_results (or filter_results / sort_results), then select_flight with a flight id from the results, then fill_traveler_details, then book_flight (the user confirms on the page).
Use airport or city names the user gave; ask for a missing date or destination. A relative date (tomorrow, next Friday, next week)? Call get_time first and use the date it gives. No origin given? Call get_location first and search from the airport it answers (say which one). get_booking looks up a booking by its reference.`;
