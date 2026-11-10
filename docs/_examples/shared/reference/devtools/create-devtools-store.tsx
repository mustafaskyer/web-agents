import { createDevtoolsStore } from "@webmcp-agents/devtools";
import { useSyncExternalStore } from "react";

// A panel of your own on the devtools' data.
const store = createDevtoolsStore({ maxCalls: 50 });

export function CallLog() {
  const calls = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().calls,
  );

  return (
    <ul>
      {calls.map((call) => (
        <li key={call.id}>
          {call.tool}: {call.status} ({call.origin})
        </li>
      ))}
    </ul>
  );
}

// Run a tool as an agent would, and read its finished record.
export async function runLatestOrder() {
  const record = await store.runTool("track_order", { id: "1002" });
  return record.status;
}
