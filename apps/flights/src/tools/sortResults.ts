/** Imperative WebTool: sort_results (results route). The cursor presses the sort bar. */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { SORTS } from "../data/flights";
import { app } from "./context";

export const sortResults = defineWebTool({
  id: "sort_results",
  title: "Sort flight results",
  description: "Sort the current flight results by price (either way), shortest duration or earliest departure.",
  inputSchema: z.object({ by: z.enum(SORTS).describe("price-asc, price-desc, duration or depart") }),
  annotations: { idempotentHint: true },
  execute: ({ by }, ctx) => app(ctx).booking.setSort(by),
});
