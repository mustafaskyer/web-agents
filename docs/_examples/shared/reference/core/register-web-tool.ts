import {
  createCallTracker,
  deferRelease,
  defineWebTool,
  registerWebTool,
} from "@webmcp-agents/core";

const getCart = defineWebTool({
  id: "get_cart",
  title: "Read the cart",
  description:
    "Read the cart without opening it: lines and total. Use " +
    "before changing the cart.",
  readOnly: true,
  execute: () => ({ lines: 2, total: "$46.00" }),
});

// Counts the tool's calls, so releasing can wait for them.
const calls = createCallTracker();
const unregister = registerWebTool(getCart, { calls });

// From UI code, release later: in-flight calls finish first.
export function dispose() {
  deferRelease(unregister, { isBusy: calls.busy });
}
