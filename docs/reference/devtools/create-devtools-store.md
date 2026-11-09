# `createDevtoolsStore`

Creates the devtools' state, independent of any UI: the page's tools, every call (run from the panel or by a real
agent) and the panel's settings. Use it to build another UI on the same data.

```ts
import { createDevtoolsStore, DEFAULT_SETTINGS } from "@webmcp-agents/devtools";
import type { DevtoolsStore, DevtoolsState } from "@webmcp-agents/devtools";
```

## Signature

```ts
function createDevtoolsStore(options?: DevtoolsStoreOptions): DevtoolsStore;

const DEFAULT_SETTINGS: DevtoolsSettings = {
  open: false, tab: "tools", dock: "bottom", size: 320, spotlight: false, yieldToUser: true,
};
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `visuals` | `DevtoolsVisuals \| null` | `null` | The agent cursor to drive from Settings. With `null` the switches are disabled. |
| `storageKey` | `string` | `"web-agents-devtools"` | `localStorage` key for settings the user changed. |
| `maxCalls` | `number` | `200` | Calls (and markers) kept in the timeline. Older ones drop off. |
| `initialSettings` | `Partial<DevtoolsSettings>` | — | Starting settings, below whatever the user saved. `undefined` entries are ignored. |
| `now` | `() => number` | `Date.now` | Clock in epoch ms. |

## Returns

A `DevtoolsStore`. `subscribe` and `getSnapshot` fit `useSyncExternalStore`.

| Member | Type | Description |
|---|---|---|
| `getSnapshot` | `() => DevtoolsState` | The current immutable snapshot. A new object per change. |
| `subscribe` | `(listener: () => void) => () => void` | Called after every change. Returns an unsubscribe function. |
| `refreshTools` | `() => void` | Re-read `getTools()` and which tools are on screen. Coalesced to one microtask. |
| `runTool` | `(name: string, args?: Record<string, unknown>) => Promise<CallRecord>` | Run a tool as the agent would (cursor and all). Resolves with the finished record; never rejects. |
| `cancel` | `(id: string) => void` | Cancel a running or waiting call. Panel runs abort their signal; agent calls need `canCancel`. |
| `clearCalls` | `() => void` | Drop finished calls and all markers. Open calls stay. |
| `locate` | `(name: string) => boolean` | Scroll the tool's `toolname` element into view and flash it. `false` when it isn't on screen. |
| `setSetting` | `<K extends keyof DevtoolsSettings>(key: K, value: DevtoolsSettings[K]) => void` | Change and persist one setting. `spotlight` and `yieldToUser` also go to `visuals`. |
| `resetLayout` | `() => void` | Dock position and size back to defaults. |
| `destroy` | `() => void` | Stop listening and restore `window.agent`. Calls in flight still settle. Idempotent. |

## Types

| Type | Shape |
|---|---|
| `DevtoolsState` | `{ tools: ToolView[]; calls: CallRecord[]; markers: TimelineMarker[]; settings: DevtoolsSettings; supported: boolean; canCancel: boolean; hasVisuals: boolean }`. `calls` and `markers` are newest first, capped at `maxCalls`. `supported`: `document.modelContext` exists. `canCancel`: `cancelTool` exists (the polyfill). |
| `DevtoolsSettings` | `{ open: boolean; tab: DevtoolsTab; dock: "bottom" \| "right"; size: number; spotlight: boolean; yieldToUser: boolean }`. `size` is the height (bottom dock) or width (right dock) in px. |
| `DevtoolsTab` | `"tools" \| "timeline" \| "settings"` |
| `DevtoolsVisuals` | `Pick<AgentVisuals, "setSpotlight" \| "setYieldToUser">` |
| `ToolView` | `{ name; title?; description; schema: SchemaNode; annotations: Record<string, unknown>; kind: "declarative" \| "imperative"; onScreen: boolean; confirms: boolean }`. `confirms`: a declarative form without `toolautosubmit`. |
| `CallRecord` | `{ id; tool; origin: "devtools" \| "agent"; args?; fills: CallFill[]; status: CallStatus; startedAt; endedAt?; result?: ModelContextToolResult; error?; prompt? }`. Times are epoch ms. `prompt` is set while `status` is `waiting`. |
| `CallStatus` | `"running" \| "waiting" \| "ok" \| "error" \| "cancelled"`. `waiting`: the browser paused for the user's confirmation click. |
| `CallFill` | `{ field: string; value: string \| boolean; at: number }` |
| `TimelineMarker` | `{ id: string; type: "yield" \| "resume"; reason?: string; at: number }` |
| `DevtoolsStoreOptions` | The options table above. |

## Example

```tsx
import { useSyncExternalStore } from "react";
import { createDevtoolsStore } from "@webmcp-agents/devtools";

const store = createDevtoolsStore();

function CallCount() {
  const calls = useSyncExternalStore(store.subscribe, () => store.getSnapshot().calls);
  return <p>{calls.length} calls</p>;
}

const record = await store.runTool("add_to_cart_mug-01", { qty: 3 });
console.log(record.status, record.result);
```

## Notes

- Creating a store sets `window.agent`. `destroy()` restores the previous value. See
  [install-agent-console.md](./install-agent-console.md).
- Without `document` (SSR) the store is inert.
- Core events carry no call id, so an event belongs to the newest unfinished call of its tool. Two concurrent calls
  of one tool may mix up.
- A result counts as an error when `isError` is set or its text starts with `Error:` or `Error [code]:`. A call that
  navigates the page resolves to the text `(navigated)`.
- Saved settings win over `initialSettings`. Saved `spotlight` and `yieldToUser` are applied to `visuals` on the next
  task; unsaved ones leave the app's own visuals options alone.
- If `localStorage` is blocked, settings still apply but are not persisted.

## See also

- [web-agents-devtools.md](./web-agents-devtools.md): `useDevtoolsStore`, the React host
- [event-client.md](./event-client.md): posting snapshots to TanStack's bus
- [parse-schema.md](./parse-schema.md): `SchemaNode`
