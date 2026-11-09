# `deferRelease`

Runs `release` on a later macrotask unless cancelled first, and keeps waiting while `isBusy()` is true. Use it for anything that unregisters a tool from UI code: Chrome cancels a call whose tool changes, and React unmounts and remounts on purpose.

```ts
import { deferRelease, RESPONSE_GRACE_MS } from "@webmcp-agents/core";
```

## Signature

```ts
function deferRelease(release: () => void, options?: DeferReleaseOptions): { cancel(): void };

interface DeferReleaseOptions {
  isBusy?: () => boolean;
  graceMs?: number;
}

const RESPONSE_GRACE_MS: 500;
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `release` | `() => void` | — | The work to defer, usually an unregister function. Runs at most once. |
| `isBusy` | `() => boolean` | never busy | While this returns `true`, keep waiting. |
| `graceMs` | `number` | `0` (polls every 50 ms) | Re-check `isBusy` this often, in ms. Values under 50 are raised to 50. |

`RESPONSE_GRACE_MS` is `500`: the time, in ms, for the browser to deliver a settled response before a tool may change.

## Returns

`{ cancel() }`. `cancel()` stops a pending release. After `release` has run, it does nothing.

## Example

The pattern for a tool registered from an effect:

```ts
import { createCallTracker, deferRelease, RESPONSE_GRACE_MS, registerWebTool } from "@webmcp-agents/core";

const calls = createCallTracker();
const off = registerWebTool(tool, { calls });

// effect cleanup
const pending = deferRelease(off, { isBusy: calls.busy, graceMs: RESPONSE_GRACE_MS });

// effect setup again in the same tick (StrictMode): keep the registration
pending.cancel();
```

## Notes

- The first check is always on a `setTimeout(…, 0)`, so a remount in the same tick can cancel it.
- [`createCallTracker`](./create-call-tracker.md)'s `busy()` already includes `RESPONSE_GRACE_MS` after the last call, so the release waits for the call and the answer.
- [`createToolRegistry`](./create-tool-registry.md) and `useWebTool` in `@webmcp-agents/react` use this with `graceMs: RESPONSE_GRACE_MS`.

## See also

- [`createCallTracker`](./create-call-tracker.md)
- [`createToolRegistry`](./create-tool-registry.md)
- [`registerWebTool`](./register-web-tool.md)
