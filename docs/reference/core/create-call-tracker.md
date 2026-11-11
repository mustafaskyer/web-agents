---
description: "Creates a counter for a tool's calls, so its unregistration can wait for them."
---

# `createCallTracker`

Creates a counter for a tool's calls, so its unregistration can wait for them. Pair it with [`deferRelease`](./defer-release.md) and pass it as `calls` to [`registerWebTool`](./register-web-tool.md); the registry and `useWebTool` already do, so you reach for it only when you register tools yourself.

## Import

```ts
import { createCallTracker } from "@webmcp-agents/core";
import type { CallTracker } from "@webmcp-agents/core";
```

## Example

Count the calls of one registration, and ask whether it is safe to unregister it. [`deferRelease`](./defer-release.md) does the waiting for you.

<include meta='title="track-calls.ts"'>/_examples/shared/reference/core/create-call-tracker.ts</include>

## Options

None: `createCallTracker()` takes no arguments.

## Returns

A `CallTracker`:

| Name | Type | Description |
|---|---|---|
| `track(call)` | `<T>(call: () => T \| Promise<T>) => Promise<T>` | Run one call and count it until it settles. Resolves or rejects with the call's own outcome. |
| `busy()` | `() => boolean` | `true` while a call runs, and for [`RESPONSE_GRACE_MS`](./defer-release.md) (500 ms) after the last one settled. |

## Notes

- The grace after the last call gives the browser time to deliver the answer before the tool changes.
- `busy` is a plain function and can be passed as `isBusy` without binding.
- A rejected call still counts as settled: the counter drops in a `finally`.
- Each tool needs its own tracker: it counts calls, not which tool they were for.

## See also

- [Tools across your app](../../build/tools-across-your-app.mdx), where tools turn on and off
- [`deferRelease`](./defer-release.md)
- [`registerWebTool`](./register-web-tool.md)
- [`createToolRegistry`](./create-tool-registry.md)
