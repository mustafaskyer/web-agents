---
description: "Runs release on a later macrotask unless cancelled first, and keeps waiting while isBusy() is true."
---

# `deferRelease`

Runs `release` on a later macrotask unless cancelled first, and keeps waiting while `isBusy()` is true. Use it for anything that unregisters a tool from UI code: Chrome cancels a call whose tool changes, and React unmounts and remounts on purpose.

## Import

```ts
import { deferRelease, RESPONSE_GRACE_MS } from "@webmcp-agents/core";
import type { DeferReleaseOptions } from "@webmcp-agents/core";
```

## Example

The pattern for a tool registered from an effect: register with a call tracker, and on cleanup release later, after the calls in flight are answered. A setup in the same tick (StrictMode) cancels the release.

<include meta='title="register-and-release.ts"'>/_examples/shared/reference/core/defer-release.ts</include>

## Options

`deferRelease(release, options?)`. The first argument is the work; the second is a `DeferReleaseOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `release` | `() => void` | required | The work to defer, usually the function `registerWebTool` returned. Runs at most once. |
| `isBusy` | `() => boolean` | never busy | While this returns `true`, keep waiting: pass a [`CallTracker`](./create-call-tracker.md)'s `busy` so a call in flight finishes first. |
| `graceMs` | `number` | `0` (polls every 50 ms) | How often to re-check `isBusy`, in ms. Values under 50 are raised to 50. Pass `RESPONSE_GRACE_MS` for registrations. |

### `RESPONSE_GRACE_MS`

A constant, `500`: the time, in ms, for the browser to deliver a settled response before a tool may change.

## Returns

`{ cancel(): void }`. `cancel()` stops a pending release; after `release` has run, it does nothing.

## Notes

- The first check is always on a `setTimeout(…, 0)`, so a remount in the same tick can cancel it.
- [`createCallTracker`](./create-call-tracker.md)'s `busy()` already includes `RESPONSE_GRACE_MS` after the last call, so the release waits for the call and then for its answer.
- [`createToolRegistry`](./create-tool-registry.md) and `useWebTool` in `@webmcp-agents/react` use this with `graceMs: RESPONSE_GRACE_MS`.
- While `isBusy()` stays true the release keeps polling; nothing times it out.

## See also

- [Tool lifecycle](../../concepts/tool-lifecycle.mdx), why unregistering is never immediate
- [`createCallTracker`](./create-call-tracker.md)
- [`createToolRegistry`](./create-tool-registry.md)
- [`registerWebTool`](./register-web-tool.md)
