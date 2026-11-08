/**
 * Imperative WebTools: open_product, browse_category, go_to_page (global)
 *
 * Navigation tools. They answer with what the agent needs next (the product's
 * options, the category's products) and then navigate. React Router navigates
 * within the document, and these tools are global, so their definitions stay
 * put and the call is never cancelled by its own navigation.
 */
import { defineWebTool, WebToolError } from "@web-agents/react";
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
export const TO_BUY = "\nNext (for you, the assistant): call open_product with a slug, then add_to_cart.";

export const openProduct = defineWebTool({
  id: "open_product",
  title: "Open a product page",
  description:
    "Open one product's page and answer its price, sizes and stock. Use after search_products or browse_category, with a slug they listed (or words from the name). Next: add_to_cart, which only exists on that page.",
  inputSchema: z.object({
    slug: z.string().optional().describe("The product's slug as search_products, browse_category or get_cart list it, e.g. ocean-tee"),
    query: z.string().optional().describe("When you have no slug: words from the product's name, e.g. linen shirt"),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ slug, query }, ctx) => {
    // An exact slug, else the best search match: agents guess slugs ("tee" for "ocean-tee"), and a near miss that
    // opens the right page beats an error a small model won't recover from.
    const words = query ?? slug?.replace(/-/g, " ");
    if (!slug && !words) throw new WebToolError("invalid_input", "Pass a slug or a query.");
    let product: Product | undefined = slug ? findProduct(slug) : undefined;
    let others: Product[] = [];
    if (!product) {
      [product, ...others] = searchProducts(words!);
      if (!product) throw new WebToolError("invalid_input", `No product matches "${words}". Try search_products with other words.`);
    }
    store(ctx).navigate(`/product/${product.slug}`);
    const next =
      product.stock === 0
        ? "It's sold out: it can't be added to the cart."
        : "Next (for you, the assistant): call add_to_cart, now on this page.";
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
  description:
    "Open a category page and list its products with slugs and prices. Use when the user wants to see a kind of thing (apparel, accessories, home, digital) or a search found nothing. Next: open_product.",
  inputSchema: z.object({
    category: z
      .enum(categorySlugs)
      .describe("apparel: clothes; accessories: bags, hats, wallets; home: kitchen and decor; digital: downloads"),
  }),
  annotations: { readOnlyHint: true },
  // the cursor clicks that category's link in the header
  target: ({ category }) => `[toolname="browse_category"] a[href=${JSON.stringify(`/category/${category}`)}]`,
  execute: ({ category }, ctx) => {
    store(ctx).navigate(`/category/${category}`);
    const items = listByCategory(category).map(productLine);
    return `Opened ${getCategory(category)?.name}:\n${items.join("\n")}${TO_BUY}`;
  },
});

const PAGES = { home: "/", "all-products": "/products", checkout: "/checkout" } as const;

export const goToPage = defineWebTool({
  id: "go_to_page",
  title: "Go to a page",
  description:
    'Go to the home page, the page with every product, or checkout. Use for "go home", "show everything", or before apply_promo and checkout (they only exist on the checkout page). For a category use browse_category; for one product, open_product.',
  inputSchema: z.object({
    page: z
      .enum(["home", "all-products", "checkout"])
      .describe("home: the front page; all-products: every product; checkout: pay for the cart (needs items in it)"),
  }),
  annotations: { readOnlyHint: true },
  // the cursor clicks the logo (home) or "All products" in the header; checkout has no header link
  target: ({ page }) => (page === "checkout" ? undefined : `header a[href=${JSON.stringify(PAGES[page])}]`),
  execute: ({ page }, ctx) => {
    const { navigate, cart } = store(ctx);
    // describe() reads the latest cart (an add_to_cart a moment ago counts); `count` is the last render's
    if (page === "checkout" && cart.describe().startsWith("The cart is empty"))
      throw new WebToolError("failed", "The cart is empty: add something first (open_product, then add_to_cart).");
    navigate(PAGES[page]);
    if (page === "home") return "Opened the home page.";
    if (page === "checkout")
      return "Opened checkout. Next: checkout with the user's email and address (ask for what you don't have); apply_promo for a code.";
    return `Opened all products (${searchProducts("").length}).${TO_BUY}`;
  },
});
