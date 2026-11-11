import {
  getLocation,
  getPage,
  getTime,
  goBack,
  goTo,
  scrollTo,
  setTheme,
} from "@webmcp-agents/tools";

import { getCart } from "../../tools/get-cart";
import { listOrders } from "../../tools/list-orders";

export const tools = {
  getTime: getTime(),
  getLocation: getLocation(),
  getPage: getPage(),
  goTo: goTo({
    pages: { home: "/", cart: "/cart", orders: "/orders" },
  }),
  goBack: goBack(),
  scrollTo: scrollTo(),
  setTheme: setTheme(),

  // your own, beside them
  getCart,
  listOrders,
};
