# `PolyfillModelContext`

The `document.modelContext` the polyfill installs: enough of the WebMCP surface to register, list, run and cancel tools, plus declarative `<form toolname>` tools, in a browser without native support. You normally get it from [`installWebMCPPolyfill`](./install-webmcp-polyfill.md), not by constructing it.

```ts
import { PolyfillModelContext } from "@webmcp-agents/polyfill";
```

## Signature

```ts
class PolyfillModelContext extends EventTarget implements ModelContext {
  ontoolchange: ((ev: Event) => void) | null;
  ontoolactivated: ((ev: ToolEvent) => void) | null;
  ontoolcancel: ((ev: ToolEvent) => void) | null;

  registerTool(tool: ModelContextTool<any>, options?: { signal?: AbortSignal }): void;
  unregisterTool(name: string): void;
  getTools(): Promise<ModelContextToolInfo[]>;
  executeTool(
    toolOrName: ModelContextToolInfo | string,
    rawArgs?: Record<string, unknown> | string,
    options?: { signal?: AbortSignal },
  ): Promise<ModelContextToolResult>;
  /** Non-standard. */
  cancelTool(name: string): boolean;
}
```

The types are core's [WebMCP types](../core/webmcp-types.md).

## Methods

| Name | Parameters | Returns | Description |
|---|---|---|---|
| `registerTool` | `tool`, `{ signal }` | `void` | Adds the tool under `tool.name` (throws `TypeError("tool.name is required")` without one) and fires `toolchange`. Aborting `signal` unregisters this registration only: if the name belongs to a newer registration by then, it stays. |
| `unregisterTool` | `name` | `void` | Removes the tool and fires `toolchange`. Does nothing for an unknown name. |
| `getTools` | — | `Promise<ModelContextToolInfo[]>` | Every registered tool without its `execute`, in registration order. |
| `executeTool` | `toolOrName`, `rawArgs = {}`, `{ signal }` | `Promise<ModelContextToolResult>` | Runs a tool. Accepts both the polyfill's `(name, object)` and Chrome's `(tool, JSON string)` shapes. |
| `cancelTool` | `name` | `boolean` | Non-standard. Cancels the running call of `name`, so dev tooling can cancel a call it didn't start. `false` when nothing runs. |

### `executeTool` in detail

- Unknown name: rejects with `Error('Unknown tool "<name>"')`.
- An already-aborted `signal`: rejects with a `DOMException` named `AbortError`.
- Fires `toolactivated` (with `.toolName`), then calls `tool.execute(args, { signal })` with a signal of its own.
- The result is normalised: an object with a `content` array is returned as is, `null`/`undefined` becomes `{ content: [] }`, a string becomes one text item, anything else is `JSON.stringify`'d into one.
- A throwing `execute` resolves to `{ content: [{ type: "text", text: message }], isError: true }`. It does not reject.
- Cancelling (aborting the caller's `signal`, or `cancelTool`) aborts the tool's own signal, fires `toolcancel`, and rejects with an `AbortError` `DOMException`. The call settles even when the tool ignores its signal, as in Chrome.

## Events

Dispatched on the instance, and also delivered to the matching `on…` property.

| Event | `.toolName` | When |
|---|---|---|
| `toolchange` | — | A tool was registered or unregistered. |
| `toolactivated` | yes | `executeTool` started a call. |
| `toolcancel` | yes | A call was cancelled, or a paused form left the page. |

## Declarative forms

`installWebMCPPolyfill` scans for `form[toolname]` on install and with a MutationObserver, and registers each as a tool:

- `name` from `toolname`; `description` from `tooldescription` (else `""`).
- Input schema from the form's named controls (`submit` and `button` inputs skipped): number and range inputs are `integer` (or `number` when `step` isn't a whole number) with `minimum`/`maximum`; checkboxes are `boolean`; selects are `string` with an `enum` of option values; `email`, `date` and `url` inputs get a `format` (`url` → `uri`); the rest are `string`. `required` controls are listed in `required`.
- Each parameter's description is `toolparamdescription`, else the first `<label>`'s text, else `aria-description`, else the control's `name`.
- Changing or removing `toolname` re-registers or unregisters the form. Removing the form unregisters it. When React remounts a form, the new one may register before the old one is removed; the old one does not take the tool down with it.

A call sets `data-tool-form-active` on the form, writes each argument like a user (native value setter, then `input` and `change` events, so controlled inputs see it), and submits. The submitter is the first `[type="submit"]`, else the first `button:not([type=button])`.

The submit is a `SubmitEvent` with `agentInvoked: true` and `respondWith(promise)`. The call answers with that promise's value, or `"Form submitted."` if the page didn't call `respondWith` during dispatch.

## Confirmation pause

Without `toolautosubmit`, and when the form has a submitter, the call pauses before submitting:

- The submitter gets `data-tool-submit-active` (a polyfill can't define the native `:tool-submit-active` pseudo-class).
- A click on it (captured, default prevented) resumes the call, which then dispatches the agent submit.
- Cancelling the call meanwhile rejects with an `AbortError` and fires `toolcancel`.
- If the submitter leaves the page before the click (the person navigated away, or the page dropped the form), the call fires `toolcancel` and resolves to a readable error instead of hanging:

```ts
{
  content: [{ type: "text", text: 'Error [interrupted]: The "checkout" form left the page before the user confirmed. Nothing was submitted.' }],
  isError: true,
  structuredContent: { error: { code: "interrupted", retryable: true } },
}
```

## Example

```ts
import { installWebMCPPolyfill } from "@webmcp-agents/polyfill";

const mc = installWebMCPPolyfill();
mc?.addEventListener("toolactivated", (e) => console.log("running", e.toolName));

const ac = new AbortController();
const result = await mc?.executeTool("apply_promo", { code: "WELCOME10" }, { signal: ac.signal });
```

## Notes

- Event order differs from Chrome: the polyfill fires `toolactivated → fill → submit`, native Chrome `fill → submit → toolactivated`. `@webmcp-agents/core` handles both.
- `unregisterTool` doesn't cancel the tool's running calls here, while Chrome does. Code that works under the polyfill can still lose calls in Chrome: release through `deferRelease` (the React hooks and registry do).
- Registering a name that is already registered replaces it without an error.
- `cancelTool` tracks one running call per name: the latest.
- A form's description and schema are read when it registers. Later changes to `tooldescription` or to its controls are not picked up until `toolname` changes or the form remounts.
- Any click on the paused submitter resumes the call; the polyfill doesn't check `isTrusted`.
- Without a submitter, a form without `toolautosubmit` submits at once, unconfirmed.
- Use core's [`executeTool`](../core/execute-tool.md) from library UI rather than calling `document.modelContext.executeTool` directly: arg shapes differ by Chrome version.

## See also

- [`installWebMCPPolyfill`](./install-webmcp-polyfill.md)
- [`@webmcp-agents/polyfill/auto`](./auto.md)
- [WebMCP types](../core/webmcp-types.md)
- [JSX attributes](../react/jsx-attributes.md)
- [`useToolAnswer`](../react/use-tool-answer.md)
- [Tool error codes](../core/tool-error.md)
