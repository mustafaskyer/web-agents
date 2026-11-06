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
  getCategory,
  getProduct,
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
    let product: Product | undefined;
    if (slug) product = getProduct(slug);
    else if (query) {
      product = searchProducts(query)[0];
      if (!product) throw new Error(`No product matches "${query}".`);
    } else throw new Error("Pass a slug or a query.");
    store(ctx).navigate(`/product/${product.slug}`);
    const next = product.stock === 0 ? "It can't be added to the cart." : "Use add_to_cart to buy it.";
    return `Opened ${describeProduct(product)} ${next}`;
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
