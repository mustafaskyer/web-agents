/**
 * Imperative WebTools: filter_results, list_results (results route)
 *
 * Route-scoped: they exist only on a results page, where there are results to
 * filter. filter_results' target is the filters card (on phones, the Filters
 * button), so the cursor shows where the change happens.
 */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { describeFlight } from "../data/flights";
import { app } from "./context";

export const filterResults = defineWebTool({
  id: "filter_results",
  title: "Filter flight results",
  description: "Filter the current flight results by number of stops and/or airlines. Omitted filters stay as they are.",
  inputSchema: z.object({
    stops: z.enum(["any", "0", "1", "2"]).optional().describe('"0" = direct only, "1" = exactly one stop, "any" = no limit'),
    airlines: z.array(z.string()).optional().describe('Airline names or codes to keep, e.g. ["Meridian"]. [] shows every airline.'),
  }),
  annotations: { idempotentHint: true },
  execute: ({ stops, airlines }, ctx) =>
    app(ctx).booking.setFilters({
      ...(stops !== undefined && { stops: stops === "any" ? "any" : (Number(stops) as 0 | 1 | 2) }),
      ...(airlines !== undefined && { airlines }),
    }),
});

export const listResults = defineWebTool({
  id: "list_results",
  title: "List flight results",
  description: "List the first flights as the page shows them (filtered and sorted), with the ids select_flight takes.",
  inputSchema: z.object({ limit: z.number().int().min(1).max(20).default(5).describe("How many to list, 1–20. Default 5.") }),
  annotations: { readOnlyHint: true },
  execute: ({ limit }, ctx) => {
    const { visible, results } = app(ctx).booking.view();
    if (visible.length === 0) return results.length ? "No flights match the filters." : "No results: search first (search_flights).";
    return [
      `${visible.length} flights match. First ${Math.min(limit, visible.length)}:`,
      ...visible.slice(0, limit).map((f) => `- ${describeFlight(f)}`),
    ].join("\n");
  },
});
