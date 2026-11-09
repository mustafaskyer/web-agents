/**
 * Imperative WebTools, global on every page: open_product, go_to_page, get_cart. Declarative forms (search_products,
 * add_to_cart, apply_promo, checkout) register by being on the page.
 */
import { defineWebTool, WebToolError } from "@webmcp-agents/react";
import { z } from "zod";
import { describeProduct, findProduct, type Product, searchProducts } from "@/lib/catalog";
import { store } from "./context";

export const openProduct = defineWebTool({
  id: "open_product",
  title: "Open a product page",
  description:
    "Open one product's page and answer its price, sizes and stock. Use after search_products, with a slug it listed (or words from the name). Next: add_to_cart, which only exists on that page.",
  inputSchema: z.object({
    slug: z.string().optional().describe("The product's slug as search_products lists it, e.g. ocean-tee"),
    query: z.string().optional().describe("When you have no slug: words from the product's name, e.g. linen shirt"),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ slug, query }, ctx) => {
    const words = query ?? slug?.replace(/-/g, " ");
    if (!slug && !words) throw new WebToolError("invalid_input", "Pass a slug or a query.");
    let product: Product | undefined = slug ? findProduct(slug) : undefined;
    if (!product) {
      [product] = searchProducts(words!);
      if (!product) throw new WebToolError("invalid_input", `No product matches "${words}". Try search_products with other words.`);
    }
    store(ctx).navigate(`/product/${product.slug}`);
    return `Opened ${describeProduct(product)} Next (for you, the assistant): call add_to_cart, now on this page.`;
  },
});

const PAGES = { home: "/", cart: "/cart", checkout: "/checkout" } as const;

export const goToPage = defineWebTool({
  id: "go_to_page",
  title: "Go to a page",
  description:
    "Go to the home page, the cart, or checkout. Use before apply_promo and checkout (they only exist on the checkout page). For one product use open_product.",
  inputSchema: z.object({
    page: z
      .enum(["home", "cart", "checkout"])
      .describe("home: every product; cart: what is in the cart; checkout: pay for the cart (needs items in it)"),
  }),
  annotations: { readOnlyHint: true },
  execute: ({ page }, ctx) => {
    const { navigate, cart } = store(ctx);
    if (page === "checkout" && cart.describe().startsWith("The cart is empty"))
      throw new WebToolError("failed", "The cart is empty: add something first (open_product, then add_to_cart).");
    navigate(PAGES[page]);
    if (page === "checkout")
      return "Opened checkout. Next: checkout with the user's email, name and address (ask for what you don't have); apply_promo for a code.";
    return page === "home" ? "Opened the home page." : "Opened the cart.";
  },
});

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: lines (slug, variant, quantity, price), promo code and totals. Use to answer questions about the cart or before checkout.",
  annotations: { readOnlyHint: true },
  execute: (_input, ctx) => store(ctx).cart.describe(),
});

export const catalog = [openProduct, goToPage, getCart];
export const globalTools = catalog.map((t) => t.id);
