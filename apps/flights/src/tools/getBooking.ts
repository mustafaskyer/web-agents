/** get_booking, on every page: reads a confirmed booking by its reference. */
import { defineWebTool, WebToolError } from "@webmcp-agents/react";
import { z } from "zod";
import { itineraryText } from "../lib/itinerary";
import { booking } from "../store/booking";

export const getBooking = defineWebTool({
  id: "get_booking",
  title: "Look up a booking",
  description:
    "Look up a confirmed booking's itinerary by its reference (SK-…), from any page. Use when the user asks about a booking they made.",
  inputSchema: z.object({
    reference: z
      .string()
      .regex(/^SK-[A-Z0-9]{6}$/i)
      .describe("The booking reference, e.g. SK-7F3K2Q"),
  }),
  readOnly: true,
  execute: ({ reference }) => {
    const found = booking.getBooking(reference);
    if (!found) throw new WebToolError("invalid_input", `No booking ${reference.toUpperCase()}.`);
    return itineraryText(found);
  },
});
