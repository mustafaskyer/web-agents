---
description: "A LocalProvider that runs a small model with transformers.js in a module Web Worker, on WebGPU when there is an adapter and on WASM otherwise."
---

# `createTransformersProvider`

A `LocalProvider` that runs a small model with transformers.js in a module Web Worker, on WebGPU when there is an adapter and on WASM otherwise. Reach for it to change which models the chat offers, or the quantization. The worker starts on `prepare()` (the person's click), never on import, and transformers.js loads only inside it, so generation never blocks the page or the agent cursor.

## Import

```ts
import {
  createTransformersProvider,
  DEFAULT_MODEL,
  MODELS,
} from "@webmcp-agents/local-agent";
import type {
  ModelInfo,
  TransformersProviderOptions,
} from "@webmcp-agents/local-agent";
```

## Example

<include meta='title="local-adapter.ts"'>/_examples/shared/reference/local-agent/create-transformers-provider.ts</include>

## Options

`createTransformersProvider(options?)` takes a `TransformersProviderOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `DEFAULT_MODEL` (Qwen3 0.6B) | The model to start with: a transformers.js text-generation model id. |
| `models` | `readonly string[]` | `[model]` | The models the person may pick from in the chat, each shown with its label, brief, size and whether it is already on the device. The last choice is remembered in localStorage (`web-agents:local-model:choice`) and wins over `model` on the next visit when it is offered. |
| `dtype` | `"q4f16" \| "q4"` | `q4f16` on WebGPU with `shader-f16`, else `q4` | Quantization. A `q4f16` model fails at its first token on a GPU without f16 shaders, so the default checks. |
| `worker` | `Worker \| (() => Worker)` | the package's own worker | The model worker, for a bundler that cannot follow `new Worker(new URL(…, import.meta.url))`. See [`/worker`](./worker.md). |
| `maxInputTokens` | `number` | `3072` for models up to 650 MB, `1536` above | Most prompt tokens per generation (estimated at about 3.5 characters per token). The loop offers fewer tools and less history to stay under it: on WebGPU a long prompt on a large model can stall the display. |

### `MODELS`

The models this provider knows the size and character of, keyed by id. Any transformers.js text-generation model id works; one that is not here gets the last path segment of its id as a label, a generic brief, no size, and no memory check.

| Name | Type | Description |
|---|---|---|
| `label` | `string` | A short name for the picker, e.g. "Qwen3 0.6B". |
| `brief` | `string` | One sentence on when to pick it. |
| `q4f16` | `number` | Weights and tokenizer in bytes for `q4f16`. |
| `q4` | `number` | The same in bytes for `q4`. |

Known ids: `onnx-community/Qwen3-0.6B-ONNX` (the default: about 585 MB q4f16, 934 MB q4), `LiquidAI/LFM2.5-1.2B-Instruct-ONNX` (about 764 MB q4f16) and `onnx-community/Qwen3-1.7B-ONNX` (about 1.4 GB q4f16; needs 8 GB of memory and WebGPU). `DEFAULT_GPU_MODEL` and `DEFAULT_CPU_MODEL` are deprecated aliases of `DEFAULT_MODEL`.

## Returns

A [`LocalProvider`](./provider-types.md#localprovider) with `id: "transformers"`, `label: "On-device"`, and `callFormat` `"pythonic"` for LFM2 models, `"tags"` otherwise.

- `availability()`: `unavailable` without Web Workers or WebAssembly, or when the model is too big for the device; `available` once loaded; otherwise `needs-download` with `bytes`, a `note` (no WebGPU) and `cached`. `cached` is answered by transformers.js itself in the worker (an exact per-file check for the dtype and device that would load), so a returning visitor never sees a Download button, and a model cached for another dtype does not count. Every model in `models` is checked, so the picker can say "on this device".
- `prepare(onProgress, signal)`: claims the page and the browser lock, then loads the model in the worker with progress from 0 to 1. Aborting terminates the worker (a partial download is re-fetched next time).
- `generate(req)`: runs in the worker with the chat template's tools, thinking off, greedy decoding, at most 384 new tokens. Stop interrupts it.
- `fits(req)`: estimated tokens of system prompt, messages and tools against `maxInputTokens`.
- `models()`: a `ModelChoice` per offered model (`selected` marks the current one, `recommended` the default).
- `selectModel(id)`: frees the current worker and switches; the next `availability()` describes the new model. Throws for an id not in `models`, and `Error [busy]` while a generation is running (`BUSY` is exported).
- `dispose()`: terminates the worker and releases the page slot and the lock.

### Freeze guards

A model on WebGPU holds hundreds of MB of GPU memory, shared with the whole system on Apple silicon. Two loaded copies, or one long prompt on a large model, have frozen a Mac until restart. So the provider:

- **Loads one model per page.** Loading stops any other provider's model on the page (a second adapter, or the copy a hot reload left behind).
- **Loads one model per browser.** A Web Lock (`web-agents:local-model`) is shared by every tab of the origin. If another tab holds it past 1.5 s, `prepare()` fails with "The on-device model is already running in another tab. …" Browsers without Web Locks get no lock.
- **Checks device memory.** Models over 650 MB are refused when `navigator.deviceMemory` reports less than 8 GB. Without `deviceMemory`, nothing is refused.
- **Frees the model on `pagehide`** (the back/forward cache would otherwise keep it) and reloads it from the browser cache on the next message.
- **Caps the prompt** at `maxInputTokens`.

## Notes

- Load errors that look like running out of memory (`bad_alloc`, `out of memory`, `Aborted(`) read as "this device doesn't have enough memory for the model. …"
- `onnx-community/Qwen3-1.7B-ONNX` is one 1.4 GB file; in testing creating its session ran out of memory, so it is opt-in.
- After the first download the page asks for persistent storage (`navigator.storage.persist()`), so a returning visitor loads from disk.
- WASM runs single-threaded unless the page is cross-origin isolated (COOP `same-origin` and COEP `require-corp`).
- Whether a model is cached is asked of transformers.js, not remembered in localStorage, so cleared site data or a changed dtype cannot make a cached model look uncached (or the reverse).

## See also

- [On-device agent](../../more/on-device-agent.mdx), the page that teaches it
- [`createLocalAdapter`](./create-local-adapter.md)
- [`/worker`](./worker.md)
- [`createPromptApiProvider`](./create-prompt-api-provider.md)
- [Provider types](./provider-types.md)
