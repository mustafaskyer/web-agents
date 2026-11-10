---
description: "An AgentAdapter for @webmcp-agents/chat that runs a model in the visitor's browser: Chrome's built-in model (Prompt API) or a small model run by transformers.js in a Web Worker."
---

# `createLocalAdapter`

An `AgentAdapter` for `@webmcp-agents/chat` that runs a model in the visitor's browser: Chrome's built-in model (Prompt API) or a small model run by transformers.js in a Web Worker. Reach for it to offer an assistant that needs no server and no API key, and where nothing the user types leaves the device.

## Import

```ts
import { createLocalAdapter } from "@webmcp-agents/local-agent";
import type { LocalAdapterOptions } from "@webmcp-agents/local-agent";
```

## Example

The on-device adapter beside the cloud one: `<AgentChat>` shows a switcher between them.

<include meta='title="components/chat.tsx"'>/_examples/shared/reference/local-agent/create-local-adapter.tsx</include>

## Options

`createLocalAdapter(options?)` takes a `LocalAdapterOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `providers` | `LocalProvider[]` | `[createPromptApiProvider(), createTransformersProvider({ model, models, dtype, worker })]` | The engines to try, in order; the first one that is ready wins. Pass your own to change the order, drop one, or plug in another engine (see [provider types](./provider-types.md)). |
| `model` | `string` | Qwen3 0.6B ONNX (`DEFAULT_MODEL`) | The transformers.js model id to start with, passed to the default transformers provider. Ignored with `providers`. |
| `models` | `readonly string[]` | `[model]` | The models the person may pick from in the chat, each shown with its brief and size. Ignored with `providers`. |
| `dtype` | `"q4f16" \| "q4"` | `q4f16` on WebGPU with f16 shaders, else `q4` | Quantization, passed to the default transformers provider. Ignored with `providers`. |
| `worker` | `Worker \| (() => Worker)` | the package's own worker | The transformers.js worker, for a bundler that cannot resolve the package's own (see [`/worker`](./worker.md)). Ignored with `providers`. |
| `instructions` | `string` | none | What the site is and how its tools fit together, in a few short lines. Goes into the system prompt under "About this site". A fallback: the page's agent (`<AgentChat agent>`, [`defineWebAgent`](../chat/define-web-agent.md)) wins when it sets instructions. |
| `maxSteps` | `number` | `6` | Model steps per user message. A fallback: the page's agent wins when it sets `maxSteps`. |
| `stepTimeoutMs` | `number` | `60000` | Time limit per generation, in ms. A model that takes longer ends the run with a message. |
| `label` | `string` | `"On-device"` | The name in the chat's adapter switcher. |

## Returns

An [`AgentAdapter`](../chat/adapter-types.md#agentadapter) with `id: "local"`, `status()`, `subscribe()`, `prepare()`, `models()`, `selectModel()` and `run()`. `models()` is the active provider's list (empty before detection); `selectModel` switches it, then detects again so the status describes the new model (a download, or ready). It rejects with `Error [busy]` while a reply, a download or a load is in progress.

### Download and cached flow

1. **Detect.** The first `status()` call in a browser checks every provider that is not `broken` (with [`detectLocalProviders`](./detect-local-providers.md)) and picks the first `available` one, else the first `downloading`, else the first `needs-download`. With none, the status is `unavailable` with the first provider's reason (or "No on-device model can run in this browser.").
2. **Status.** `available` is `ready`. `needs-download` is `needs-download` with `bytes` and `note`, and the chat shows a download card. A provider already `downloading` is shown as `needs-download` with a note to continue, since progress is only reported once `prepare()` follows it.
3. **Consent.** Nothing downloads until `prepare()`, which the chat calls from the person's Download click. The status goes `downloading` (0 to 1), then `ready`. Aborting the signal cancels and restores the previous status; any other failure sets `error` ("The model couldn't load: …").
4. **Cached.** A provider that reports `needs-download` with `cached: true` (downloaded on an earlier visit) shows as `ready`. The first `run()` reads it from disk with the status `loading` (with `progress`, 0 to 1), never `downloading`: the chat says "Loading the model from this device…", and there is no second click.

### Fallback between providers

If a provider turns out not to run here after all (Chrome's model reports `available` but cannot start a session), it sets `broken`. The adapter drops it mid-run, detects again, and answers with the next provider if that one is `ready` (for example a cached transformers.js model). Otherwise it replies: "Chrome's built-in model can't run on this device. Download the on-device model below, then send your message again." A broken Prompt API is remembered per browser version in localStorage.

## Notes

- Create it once per page, outside any component.
- `run()` before the status is `ready` yields an `error` part: "The on-device model isn't ready: download it first."
- An assistant `message-start` is held back until its first part, so a provider that fails to start leaves no empty bubble.
- Keep `instructions` short: every token counts against the prompt budget.
- `maxTools` and `maxInputTokens` are not adapter options: pass your own `providers` (`createTransformersProvider({ dtype, maxInputTokens })`) or use [`runLocalAgent`](./run-local-agent.md).
- With Vite, exclude the package from pre-bundling and use ES workers (see [`/worker`](./worker.md)).
- 0.6B to 1.7B models handle one explicit action well and multi-step plans poorly. Offer the cloud assistant next to it.

## See also

- [On-device agent](../../more/on-device-agent.mdx), the page that teaches it
- [`runLocalAgent`](./run-local-agent.md), what a run does
- [`createTransformersProvider`](./create-transformers-provider.md) and [`createPromptApiProvider`](./create-prompt-api-provider.md)
- [Provider types](./provider-types.md)
- [`<AgentChat>`](../chat/agent-chat.md)
