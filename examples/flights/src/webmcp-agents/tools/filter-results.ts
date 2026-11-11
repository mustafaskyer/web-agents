/**
 * filter_results, on a results page (`match`): there are results to filter only there.
 *
 * It acts on the filters themselves: the cursor goes to the option the call sets (the stops radio, else the first
 * airline's checkbox) and ticks the stops radio (named `stops`, so the parameter of that name is written into it). On
 * a phone the filters are in a closed sheet, so it goes to the Filters button instead.
 */
import { defineWebTool, locate } from "@webmcp-agents/core";
import { z } from "zod";
import { airline, airlineCodes } from "../../data/flights";
import { RESULTS_PATTERN } from "../../lib/search-params";
import { booking } from "../../store/booking";

/** The stops radios' labels, by the value an agent sends. */
const STOPS_LABEL = { any: "Any", "0": "Direct", "1": "1 stop", "2": "2 stops" } as const;

/** The airline's checkbox label: its name, from a name or a code; undefined for one Skyline doesn't know. */
function airlineName(name: string | undefined): string | undefined {
  try {
    return name ? airline(airlineCodes([name])[0]!)?.name : undefined;
  } catch {
    return undefined;
  }
}

// An agent calls this.
export const filterResults = defineWebTool({
  id: "filter_results",
  title: "Filter flight results",
  description:
    "Narrow the current results by stops and/or airlines (omitted filters stay as they are). Needs: a search (search_flights). Next: list_results to see what's left.",
  inputSchema: z.object({
    stops: z.enum(["any", "0", "1", "2"]).optional().describe('"0" = direct only, "1" = exactly one stop, "any" = no limit'),
    airlines: z.array(z.string()).optional().describe('Airline names or codes to keep, e.g. ["Meridian"]. [] shows every airline.'),
  }),
  repeatable: true,
  match: RESULTS_PATTERN,

  // the option the call sets; on a phone (filters in a closed sheet) the Filters button
  target: ({ stops, airlines }) => {
    const option = stops ? { role: "radio", name: STOPS_LABEL[stops] } : { role: "checkbox", name: airlineName(airlines?.[0]) };
    return (option.name && locate(option)) || { role: "button", name: /^Filters/ };
  },

  execute: ({ stops, airlines }) =>
    booking.setFilters({
      ...(stops !== undefined && { stops: stops === "any" ? "any" : (Number(stops) as 0 | 1 | 2) }),
      ...(airlines !== undefined && { airlines }),
    }),
});
