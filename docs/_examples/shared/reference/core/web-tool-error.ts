import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { z } from "zod";

const bookings = new Map([["SK-7F3K2Q", "LHR to JFK, 9 Dec, 08:15"]]);

export const getBooking = defineWebTool({
  id: "get_booking",
  title: "Look up a booking",
  description:
    "Look up a confirmed booking's itinerary by its reference " +
    "(SK-…). Use after booking, from any page.",
  inputSchema: z.object({
    reference: z.string().describe("e.g. SK-7F3K2Q"),
  }),
  readOnly: true,
  execute: ({ reference }) => {
    const found = bookings.get(reference.toUpperCase());
    if (!found)
      throw new WebToolError(
        "invalid_input",
        `No booking ${reference.toUpperCase()}. Check the reference.`,
      );
    return found;
  },
});
