/** sort_results, on a results page (`match`). The cursor presses that sort's button in the sort bar ("Price: low to high"). */
import { defineWebTool } from "@webmcp-agents/react";
import { z } from "zod";
import { SORT_LABEL, SORTS } from "../data/flights";
import { RESULTS_PATTERN } from "../lib/searchParams";
import { booking } from "../store/booking";

export const sortResults = defineWebTool({
  id: "sort_results",
  title: "Sort flight results",
  description:
    "Sort the current results by price (either way), shortest duration or earliest departure. Needs: a search (search_flights). Next: list_results.",
  inputSchema: z.object({ by: z.enum(SORTS).describe("price-asc, price-desc, duration or depart") }),
  repeatable: true,
  match: RESULTS_PATTERN,
  target: ({ by }) => ({ role: "button", name: SORT_LABEL[by] }),
  execute: ({ by }) => booking.setSort(by),
});
