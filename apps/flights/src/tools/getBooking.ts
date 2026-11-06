/** Imperative WebTool: get_booking (global). Reads a confirmed booking by reference. */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import { itineraryText } from "../lib/itinerary";
import { app } from "./context";

export const getBooking = defineWebTool({
  id: "get_booking",
  title: "Look up a booking",
  description: "Read a confirmed booking's itinerary by its reference.",
  inputSchema: z.object({
    reference: z
      .string()
      .regex(/^SK-[A-Z0-9]{6}$/i)
      .describe("The booking reference, e.g. SK-7F3K2Q"),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ reference }, ctx) => {
    const booking = app(ctx).booking.getBooking(reference);
    if (!booking) throw new Error(`No booking ${reference.toUpperCase()}.`);
    return itineraryText(booking);
  },
});
