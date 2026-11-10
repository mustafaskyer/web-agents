import {
  createCallTracker,
  defineWebTool,
  registerWebTool,
} from "@webmcp-agents/core";

const tool = defineWebTool({
  id: "get_time",
  description: "Read the time.",
  readOnly: true,
  execute: () => new Date().toISOString(),
});

// registerWebTool counts each call of the tool on this tracker.
const calls = createCallTracker();
export const unregister = registerWebTool(tool, { calls });

// You can count your own work on it too.
export async function refresh(load: () => Promise<void>) {
  await calls.track(load);
}

// While a call runs, and for 500 ms after the last one settled.
export const canUnregister = () => !calls.busy();
