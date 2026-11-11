import {
  getLocation,
  getPage,
  getTime,
  goTo,
  setTheme,
} from "@webmcp-agents/tools";

import { getCart } from "./get-cart";
import { listOrders } from "./list-orders";
import { trackOrder } from "./track-order";

// Every tool the app has, by name. The provider registers them, and
// each one's `match` says where it is on.
export const tools = {
  // Common tools, ready-made.
  getTime: getTime(),
  getLocation: getLocation(),
  getPage: getPage(),
  goTo: goTo({
    pages: { home: "/", cart: "/cart", orders: "/orders" },
  }),
  setTheme: setTheme(),

  // Your own.
  getCart,
  listOrders,
  trackOrder,
};
