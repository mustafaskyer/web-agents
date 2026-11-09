/**
 * Skyline's agent (defineWebAgent): shared by the browser (<AgentChat agent>), the Vite dev plugin and the Vercel
 * route, so the cloud and the on-device assistant follow the same booking flow. No DOM, no secrets.
 */
import { defineWebAgent } from "@webmcp-agents/chat/agent";

export const concierge = defineWebAgent({
  id: "concierge",
  instructions: [
    "Skyline books flights in this order: search_flights (from, to, date, travelers), then list_results (or filter_results / sort_results), then select_flight with a flight id from the results, then fill_traveler_details, then book_flight (the user confirms on the page).",
    "Use airport or city names the user gave; ask for a missing date or destination. A relative date (tomorrow, next Friday, next week)? Call get_time first and use the date it gives.",
    "No origin given? Call get_location first and search from the airport it answers (say which one). get_booking looks up a booking by its reference.",
  ],
});
