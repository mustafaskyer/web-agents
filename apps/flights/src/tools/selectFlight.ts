/**
 * Imperative WebTool: select_flight (results route)
 *
 * Picks a flight and moves to the booking page. The registry releases
 * route-scoped tools only after their calls settle, so leaving the results
 * page doesn't cancel this call. A target is a fixed selector, so the cursor
 * goes to the result list rather than the exact card.
 */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { describeFlight, fareFor, money } from "../data/flights";
import { app } from "./context";

export const selectFlight = defineWebTool({
  id: "select_flight",
  title: "Select a flight",
  description: "Choose a flight from the current results by id and open the booking page.",
  inputSchema: z.object({ flightId: z.string().describe("The flight's id from search_flights or list_results, e.g. F-3K2") }),
  execute: ({ flightId }, ctx) => {
    const { booking, navigate } = app(ctx);
    const flight = booking.select(flightId);
    navigate("/flights/booking");
    const fare = booking.query ? ` Total ${money(fareFor(booking.query, flight).total)} incl. taxes.` : "";
    return `Selected ${describeFlight(flight)}.${fare} Next: fill_traveler_details, then book_flight.`;
  },
});
