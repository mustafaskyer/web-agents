/**
 * Skyline's agent (defineWebAgent): shared by the browser (<AgentChat agent> in src/root.tsx), the Vite dev plugin and
 * the Vercel route, so the cloud and the on-device assistant follow the same booking flow. No DOM, no secrets. The
 * catalog's tools are listed by reference (tools/index.ts has no React, so the server can import it); the forms' own
 * tools (`useWebTool` in a hook, webmcp-agents/hooks/) by their ids.
 */
import { defineWebAgent } from "@webmcp-agents/chat/agent";
import { tools } from "./tools";

export const concierge = defineWebAgent({
  id: "concierge",
  instructions: [
    "Skyline books flights in this order: search_flights (from, to, date, travelers), then list_results (or filter_results / sort_results), then select_flight with a flight id from the results, then fill_traveler_details, then book_flight (the user confirms on the page).",
    "Use airport or city names the user gave; ask for a missing date or destination. A relative date (tomorrow, next Friday, next week)? Call get_time first and use the date it gives.",
    "No origin given? Call get_location first and search from the airport it answers (say which one). get_booking looks up a booking by its reference.",
  ],
  tools: [
    tools.getTime,
    tools.getLocation,
    tools.getBooking,
    tools.filterResults,
    tools.sortResults,
    tools.listResults,
    tools.selectFlight,

    // The forms' tools (useWebTool in webmcp-agents/hooks/) go in by their ids.
    "search_flights",
    "fill_traveler_details",
    "book_flight",
  ],
});

// What /api/chat serves (api/chat.ts, and the Vite dev plugin in vite.config.ts): the top-level agents.
export const agents = [concierge];
