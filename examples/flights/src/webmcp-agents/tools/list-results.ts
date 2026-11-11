/** list_results, on a results page (`match`): what the page shows, in words, with the ids select_flight takes. */
import { defineWebTool } from "@webmcp-agents/core";
import { z } from "zod";
import { describeFlight } from "../../data/flights";
import { RESULTS_PATTERN } from "../../lib/search-params";
import { booking } from "../../store/booking";

// An agent calls this.
export const listResults = defineWebTool({
  id: "list_results",
  title: "List flight results",
  description:
    "List flights from the current results as the page shows them (filtered, sorted), with the ids select_flight needs. Needs: a search (search_flights). Next: select_flight.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5).describe("How many to list, 1–20. Default 5.") }),
  readOnly: true,
  match: RESULTS_PATTERN,
  execute: ({ limit }) => {
    const { visible, results } = booking.view();
    if (visible.length === 0) return results.length ? "No flights match the filters." : "No results: search first (search_flights).";
    return [
      `${visible.length} flights match. First ${Math.min(limit, visible.length)}:`,
      ...visible.slice(0, limit).map((f) => `- ${describeFlight(f)}`),
    ].join("\n");
  },
});
