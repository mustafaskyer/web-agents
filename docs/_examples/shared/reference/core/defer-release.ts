import {
  createCallTracker,
  defineWebTool,
  deferRelease,
  RESPONSE_GRACE_MS,
  registerWebTool,
} from "@webmcp-agents/core";

const tool = defineWebTool({
  id: "get_cart",
  description: "Read the cart.",
  readOnly: true,
  execute: () => ({ items: 2 }),
});

// Setup: register, and count the calls that reach the tool.
const calls = createCallTracker();
const unregister = registerWebTool(tool, { calls });

// Cleanup: not now. Wait a tick, then for calls to be answered.
const pending = deferRelease(unregister, {
  isBusy: calls.busy,
  graceMs: RESPONSE_GRACE_MS,
});

// Setup again in the same tick (React StrictMode): keep the tool.
pending.cancel();
