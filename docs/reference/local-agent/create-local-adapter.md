# `createLocalAdapter`

An `AgentAdapter` for `@webmcp-agents/chat` that runs a model in the visitor's browser: Chrome's built-in model (Prompt
API) or a small model run by transformers.js in a Web Worker. No server, no API key, and nothing the user types leaves
the device.

```ts
import { createLocalAdapter } from "@webmcp-agents/local-agent";
import type { LocalAdapterOptions } from "@webmcp-agents/local-agent";
```

## Signature

```ts
function createLocalAdapter(opts?: LocalAdapterOptions): AgentAdapter;

interface LocalAdapterOptions extends Pick<LocalLoopOptions, "maxSteps" | "stepTimeoutMs" | "instructions"> {
  providers?: LocalProvider[];
  model?: string;
  models?: readonly string[];
  dtype?: "q4f16" | "q4";
  worker?: Worker | (() => Worker);
  label?: string;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `providers` | `LocalProvider[]` | `[createPromptApiProvider(), createTransformersProvider({ model, worker })]` | Engines to try, in order. |
| `model` | `string` | Qwen3 0.6B ONNX (`DEFAULT_MODEL`) | transformers.js model id to start with, passed to the default transformers provider. Ignored with `providers`. |
| `models` | `readonly string[]` | `[model]` | Models the person may pick from in the chat (a picker with each one's brief and size). Ignored with `providers`. |
| `dtype` | `"q4f16" \| "q4"` | by device | Quantization, passed to the default transformers provider. Ignored with `providers`. |
| `worker` | `Worker \| (() => Worker)` | the package's own worker | The transformers.js worker, when your bundler can't resolve the package's own. Ignored with `providers`. |
| `instructions` | `string` | — | What the site is and how its tools fit together, in a few short lines. Goes into the system prompt under "About this site". A fallback: the page's agent (`<AgentChat agent>`, [`defineWebAgent`](../chat/define-web-agent.md)) wins when it sets instructions. |
| `maxSteps` | `number` | `6` | Model steps per user message. |
| `stepTimeoutMs` | `number` | `60_000` | Time limit per generation. |
| `label` | `string` | `"On-device"` | Shown in the chat's adapter switcher. |

## Returns

An [`AgentAdapter`](../chat/adapter-types.md#agentadapter) with `id: "local"`, `status()`, `subscribe()`, `prepare()`,
`models()`, `selectModel()` and `run()`. `models()` is the active provider's list (empty before detection); `selectModel`
switches it, then detects again so the status describes the new model (a download, or ready). It rejects with
`Error [busy]` while a reply, a download or a load is in progress.

## Download and cached flow

1. **Detect.** The first `status()` call in a browser checks every provider that isn't `broken` (with
   [`detectLocalProviders`](./detect-local-providers.md)) and picks the first `available` one, else the first
   `downloading`, else the first `needs-download`. With none, the status is `unavailable` with the first provider's
   reason (or "No on-device model can run in this browser.").
2. **Status.** `available` is `ready`. `needs-download` is `needs-download` with `bytes` and `note`, and the chat shows
   a download card. A provider already `downloading` is shown as `needs-download` with a note to continue, since
   progress is only reported once `prepare()` follows it.
3. **Consent.** Nothing downloads until `prepare()`, which the chat calls from the person's Download click. The status
   goes `downloading` (0 to 1), then `ready`. Aborting the signal cancels and restores the previous status; any other
   failure sets `error` ("The model couldn't load: …").
4. **Cached.** A provider that reports `needs-download` with `cached: true` (downloaded on an earlier visit) shows as
   `ready`. The first `run()` reads it from disk with the status `loading` (with `progress`, 0 to 1), never
   `downloading`: the chat says "Loading the model from this device…", and there is no second click.

## Fallback between providers

If a provider turns out not to run here after all (Chrome's model reports `available` but can't start a session), it
sets `broken`. The adapter drops it mid-run, detects again, and answers with the next provider if that one is
`ready` (for example a cached transformers.js model). Otherwise it replies: "Chrome's built-in model can't run on this
device. Download the on-device model below, then send your message again." A broken Prompt API is remembered per
browser version in localStorage.

## Example

```tsx
// apps/ecommerce/src/Root.tsx
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter } from "@webmcp-agents/local-agent";

const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ instructions: STORE_INSTRUCTIONS })];

<AgentChat adapters={ADAPTERS} title="Assistant" />
```

```ts
// apps/ecommerce/src/tools/instructions.ts (excerpt)
export const STORE_INSTRUCTIONS = `…
To find a product: search_products with one key word, or browse_category. To show one: open_product with its slug.
add_to_cart only exists on a product's page: open_product first. …`;
```

## Notes

- Create it once per page.
- `run()` before the status is `ready` yields an `error` part: "The on-device model isn't ready: download it first."
- An assistant `message-start` is held back until its first part, so a provider that fails to start leaves no empty
  bubble.
- `instructions`: keep them short; every token counts against the prompt budget.
- `maxTools`, `dtype` and `maxInputTokens` aren't adapter options: pass your own `providers`
  (`createTransformersProvider({ dtype, maxInputTokens })`) or use [`runLocalAgent`](./run-local-agent.md).
- With Vite, exclude the package from pre-bundling and use ES workers (see [worker](./worker.md)).
- 0.6B to 1.7B models handle one explicit action well and multi-step plans poorly. Offer the cloud assistant next to
  it.

## See also

- [`runLocalAgent`](./run-local-agent.md): what a run does
- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createPromptApiProvider`](./create-prompt-api-provider.md)
- [Provider types](./provider-types.md)
- [`AgentChat`](../chat/agent-chat.md)
