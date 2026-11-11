import {
  defineWebTool,
  waitingForUser,
  WebToolError,
} from "@webmcp-agents/core";
import { z } from "zod";

/** The size the person picks, or null if they dismiss it. */
declare function askForSize(): Promise<string | null>;

export const addToCart = defineWebTool({
  id: "add_to_cart",
  title: "Add to cart",
  description:
    "Add the product to the cart. Needs a size: if none is given " +
    "the person is asked to choose one.",
  inputSchema: z.object({
    size: z.string().optional().describe("e.g. M"),
  }),
  execute: async ({ size }) => {
    let chosen = size ?? null;
    if (!chosen) {
      waitingForUser("add_to_cart", "Choose a size");
      chosen = await askForSize();
    }
    if (!chosen)
      throw new WebToolError(
        "needs_user",
        "The person did not choose a size. Ask which one they want.",
      );
    return `Added one in size ${chosen}.`;
  },
});
