/**
 * Imperative WebTools: open_product, browse_category (global)
 *
 * Navigation tools. They answer with what the agent needs next (the product's
 * options, the category's products) and then navigate. React Router navigates
 * within the document, and these tools are global, so their definitions stay
 * put and the call is never cancelled by its own navigation.
 */
import { defineWebTool } from "@web-agents/react";
import { z } from "zod";
import {
  categorySlugs,
  describeProduct,
  type Product,
  findProduct,
  getCategory,
  listByCategory,
  productLine,
  searchProducts,
} from "../data/catalog";
import { store } from "./context";

/** Where to go from a list: add_to_cart only exists on a product's page. */
export const TO_BUY = "\nTo buy one: open_product with its slug, then add_to_cart.";

export const openProduct = defineWebTool({
  id: "open_product",
  title: "Open a product page",
  description:
    "Open a product's page by slug, or by search query (the best match opens). The answer lists its options; then use add_to_cart.",
  inputSchema: z.object({
    slug: z.string().optional().describe("Product slug, e.g. ocean-tee"),
    query: z.string().optional().describe("Used when the slug is unknown: words from the product's name, e.g. linen shirt"),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ slug, query }, ctx) => {
    // An exact slug, else the best search match: agents guess slugs ("tee" for "ocean-tee"), and a near miss that
    // opens the right page beats an error a small model won't recover from.
    const words = query ?? slug?.replace(/-/g, " ");
    if (!slug && !words) throw new Error("Pass a slug or a query.");
    let product: Product | undefined = slug ? findProduct(slug) : undefined;
    let others: Product[] = [];
    if (!product) {
      [product, ...others] = searchProducts(words!);
      if (!product) throw new Error(`No product matches "${words}". Try search_products with other words.`);
    }
    store(ctx).navigate(`/product/${product.slug}`);
    const next = product.stock === 0 ? "It can't be added to the cart." : "Use add_to_cart to buy it.";
    const alsoMatched = others.length
      ? ` Best match for "${words}"; also matched: ${others
          .slice(0, 4)
          .map((p) => p.slug)
          .join(", ")}.`
      : "";
    return `Opened ${describeProduct(product)} ${next}${alsoMatched}`;
  },
});

export const browseCategory = defineWebTool({
  id: "browse_category",
  title: "Browse a category",
  description: "Open a category page and list its products with slugs and prices.",
  inputSchema: z.object({ category: z.enum(categorySlugs).describe("The category to open") }),
  annotations: { readOnlyHint: true },
  // the cursor clicks that category's link in the header
  target: ({ category }) => `[toolname="browse_category"] a[href=${JSON.stringify(`/category/${category}`)}]`,
  execute: ({ category }, ctx) => {
    store(ctx).navigate(`/category/${category}`);
    const items = listByCategory(category).map(productLine);
    return `Opened ${getCategory(category)?.name}:\n${items.join("\n")}${TO_BUY}`;
  },
});
