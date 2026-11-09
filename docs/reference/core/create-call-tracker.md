# `createCallTracker`

Creates a counter for a tool's calls, so its unregistration can wait for them. Pair it with [`deferRelease`](./defer-release.md) and pass it as `calls` to [`registerWebTool`](./register-web-tool.md).

```ts
import { createCallTracker } from "@webmcp-agents/core";
```

## Signature

```ts
function createCallTracker(): CallTracker;

interface CallTracker {
  track<T>(call: () => T | Promise<T>): Promise<T>;
  busy(): boolean;
}
```

## Parameters

None.

## Returns

A `CallTracker`:

| Method | Description |
|---|---|
| `track(call)` | Run one call and count it until it settles. Resolves or rejects with the call's outcome. |
| `busy()` | `true` while a call runs, and for [`RESPONSE_GRACE_MS`](./defer-release.md) (500 ms) after the last one settled. |

## Example

```ts
import { createCallTracker, deferRelease, registerWebTool } from "@webmcp-agents/core";

const calls = createCallTracker();
const off = registerWebTool(placeOrder, { calls });

// later
deferRelease(off, { isBusy: calls.busy });
```

## Notes

- The grace after the last call gives the browser time to deliver the answer before the tool changes.
- `busy` is a plain function and can be passed as `isBusy` without binding.

## See also

- [`deferRelease`](./defer-release.md)
- [`registerWebTool`](./register-web-tool.md)
- [`createToolRegistry`](./create-tool-registry.md)
