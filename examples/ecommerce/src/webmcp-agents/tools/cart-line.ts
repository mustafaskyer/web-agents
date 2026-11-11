/** The input that names one cart line, shared by update_cart_item and remove_from_cart. */
import { z } from "zod";

export const cartLineInput = z.object({
  slug: z.string().describe("The line's product slug, as get_cart lists it, e.g. ocean-tee"),
  variant: z.string().optional().describe("The line's size (S, M, L…), as listed; needed when the cart has the product in several"),
});
