/**
 * Imperative WebTool: select_flight (results route)
 *
 * Picks a flight and moves to the booking page. The registry releases
 * route-scoped tools only after their calls settle, so leaving the results
 * page doesn't cancel this call. The cursor presses that flight's Select button.
 */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { describeFlight, fareFor, money } from "../data/flights";
import { app } from "./context";

export const selectFlight = defineWebTool({
  id: "select_flight",
  title: "Select a flight",
  description:
    "Choose one flight by its id and open its booking page. Needs: an id from list_results (search_flights first). Next: fill_traveler_details, then book_flight.",
  inputSchema: z.object({ flightId: z.string().describe("The flight's id exactly as list_results lists it, e.g. F-3K2") }),
  target: ({ flightId }) => `[data-flight-id=${JSON.stringify(String(flightId).toUpperCase())}] button`,
  execute: ({ flightId }, ctx) => {
    const { booking, navigate } = app(ctx);
    const flight = booking.select(flightId);
    navigate("/flights/booking");
    const fare = booking.query ? ` Total ${money(fareFor(booking.query, flight).total)} incl. taxes.` : "";
    return `Selected ${describeFlight(flight)}.${fare} Next: fill_traveler_details, then book_flight.`;
  },
});
