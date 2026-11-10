/**
 * The store's app-wide tools, on every page: open_product, go_to_page, get_cart. They read the cart store directly
 * (lib/cart-store.ts) and navigate with the App Router (lib/navigate.ts), so the provider passes them nothing.
 *
 * Plain modules with no React: agents.ts lists them, and the chat route imports agents.ts on the server. The rest are
 * component tools (`useWebTool`), on while their component is mounted: search_products (header), add_to_cart (a
 * product page), apply_promo and checkout (checkout).
 */
import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { z } from "zod";
import { cart } from "@/lib/cart-store";
import { describeProduct, findProduct, type Product, searchProducts } from "@/lib/catalog";
import { navigate } from "@/lib/navigate";

export const openProduct = defineWebTool({
  id: "open_product",
  title: "Open a product page",
  description:
    "Open one product's page and answer its price, sizes and stock. Use after search_products, with a slug it listed (or words from the name). Next: add_to_cart, which only exists on that page.",
  inputSchema: z.object({
    slug: z.string().optional().describe("The product's slug as search_products lists it, e.g. ocean-tee"),
    query: z.string().optional().describe("When you have no slug: words from the product's name, e.g. linen shirt"),
  }),
  readOnly: true,
  // the product's card, when the page lists it ("Ocean Tee $48.00" starts with its name); elsewhere it runs unseen
  target: ({ slug }) => {
    const name = slug && findProduct(slug)?.name;
    return name ? { role: "link", name } : undefined;
  },
  execute: ({ slug, query }) => {
    const words = query ?? slug?.replace(/-/g, " ");
    if (!slug && !words) throw new WebToolError("invalid_input", "Pass a slug or a query.");
    let product: Product | undefined = slug ? findProduct(slug) : undefined;
    if (!product) {
      [product] = searchProducts(words!);
      if (!product) throw new WebToolError("invalid_input", `No product matches "${words}". Try search_products with other words.`);
    }
    navigate(`/product/${product.slug}`);
    return `Opened ${describeProduct(product)} Next (for you, the assistant): call add_to_cart, now on this page.`;
  },
});

const PAGES = { home: "/", cart: "/cart", checkout: "/checkout" } as const;
/** The header's links: the store's name for home, "Cart (2)" for the cart. Checkout has none in the header. */
const LINKS = { home: "Field Store", cart: /^Cart \(/ } as const;

/**
 * Not `goTo` from @webmcp-agents/tools: checkout has no link in the header (it would load the page and lose the chat),
 * and it needs a cart with something in it.
 */
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
  readOnly: true,
  target: ({ page }) => (page === "checkout" ? undefined : { role: "link", name: LINKS[page] }),
  execute: ({ page }) => {
    if (page === "checkout" && cart.describe().startsWith("The cart is empty"))
      throw new WebToolError("failed", "The cart is empty: add something first (open_product, then add_to_cart).");
    navigate(PAGES[page]);
    if (page === "checkout")
      return "Opened checkout. Next: checkout with the user's email, name, address and country (ask for what you don't have); apply_promo for a code.";
    return page === "home" ? "Opened the home page." : "Opened the cart.";
  },
});

export const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart: lines (slug, variant, quantity, price), promo code and totals. Use to answer questions about the cart or before checkout.",
  readOnly: true,
  execute: () => cart.describe(),
});

export const tools = { openProduct, goToPage, getCart };
