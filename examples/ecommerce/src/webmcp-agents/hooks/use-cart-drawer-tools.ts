/**
 * The cart drawer's tools. update_cart_item, remove_from_cart and close_cart are defined in ../tools and on only while
 * the drawer is open, so they exist exactly when their controls are on screen. And while it is open, a tool that isn't
 * about the cart closes it first (the drawer's job of the docs' "CloseDrawerForOtherTools"): the agent never works on
 * a page hidden behind it.
 */
import { useAgentEvents, useWebTool } from "@webmcp-agents/react";
import { ui } from "../../store/ui";
import { closeCart } from "../tools/close-cart";
import { getCart } from "../tools/get-cart";
import { openCart } from "../tools/open-cart";
import { removeFromCart } from "../tools/remove-from-cart";
import { updateCartItem } from "../tools/update-cart-item";

/** Tools that work with the drawer open; any other closes it before it runs. */
const DRAWER_TOOLS = new Set([updateCartItem, removeFromCart, closeCart, openCart, getCart].map((tool) => tool.id));

/** Turns the drawer's tools on while `cartOpen`, and closes the drawer when any other tool starts. */
export function useCartDrawerTools(cartOpen: boolean): void {
  useWebTool(updateCartItem, { enabled: cartOpen });
  useWebTool(removeFromCart, { enabled: cartOpen });
  useWebTool(closeCart, { enabled: cartOpen });

  useAgentEvents((e) => {
    if (e.type === "start" && ui.cartOpen && !DRAWER_TOOLS.has(e.tool)) ui.closeCart();
  });
}
