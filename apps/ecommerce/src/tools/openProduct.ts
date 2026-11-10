/**
 * open_product, browse_category, go_to_page: the navigation tools, on every page.
 *
 * They answer with what the agent needs next (the product's options, the category's products) and then navigate with
 * the router (src/lib/navigate.ts), within the document, so the call is never cancelled by its own navigation. The
 * cursor goes to the link a person would click: a product's card, a category's link by its name, the logo for home.
 */
import { defineWebTool, WebToolError } from "@webmcp-agents/react";
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
} from "../data/catalog.ts";
import { navigate } from "../lib/navigate.ts";
import { cart } from "../store/cart.ts";

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
  readOnly: true,
  // the product's card, when the page lists it ("Ocean Tee $48.00" starts with its name); elsewhere it runs unseen
  target: ({ slug }) => {
    const name = slug && findProduct(slug)?.name;
    return name ? { role: "link", name } : undefined;
  },
  execute: ({ slug, query }) => {
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
    navigate(`/product/${product.slug}`);
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
  readOnly: true,
  // the cursor clicks that category's link: the first one named like it, in the header
  target: ({ category }) => ({ role: "link", name: getCategory(category)?.name }),
  execute: ({ category }) => {
    navigate(`/category/${category}`);
    const items = listByCategory(category).map(productLine);
    return `Opened ${getCategory(category)?.name}:\n${items.join("\n")}${TO_BUY}`;
  },
});

const PAGES = { home: "/", "all-products": "/products", checkout: "/checkout" } as const;
/** The header link each page has: the logo, "All products". Checkout has none: that call runs unseen. */
const LINKS = { home: "Field Store", "all-products": "All products" } as const;

/**
 * Not `goTo` from @webmcp-agents/tools: checkout has no link to click (it would load the page and lose the chat) and
 * needs a cart with something in it.
 */
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
  readOnly: true,
  target: ({ page }) => (page === "checkout" ? undefined : { role: "link", name: LINKS[page] }),
  execute: ({ page }) => {
    if (page === "checkout" && cart.describe().startsWith("The cart is empty"))
      throw new WebToolError("failed", "The cart is empty: add something first (open_product, then add_to_cart).");
    navigate(PAGES[page]);
    if (page === "home") return "Opened the home page.";
    if (page === "checkout")
      return "Opened checkout. Next: checkout with the user's email and address (ask for what you don't have); apply_promo for a code.";
    return `Opened all products (${searchProducts("").length}).${TO_BUY}`;
  },
});
