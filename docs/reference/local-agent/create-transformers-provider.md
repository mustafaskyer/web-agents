# `createTransformersProvider`

A `LocalProvider` that runs a small model with transformers.js in a module Web Worker, on WebGPU when there is an
adapter and on WASM otherwise. The worker starts on `prepare()` (the person's click), never on import, and
transformers.js loads only inside it, so generation never blocks the page or the agent cursor.

```ts
import { createTransformersProvider, DEFAULT_MODEL, MODELS } from "@webmcp-agents/local-agent";
import type { ModelInfo, TransformersProviderOptions } from "@webmcp-agents/local-agent";
```

## Signature

```ts
function createTransformersProvider(opts?: TransformersProviderOptions): LocalProvider;

interface TransformersProviderOptions {
  model?: string;
  models?: readonly string[];
  dtype?: "q4f16" | "q4";
  worker?: Worker | (() => Worker);
  maxInputTokens?: number;
}

interface ModelInfo { label: string; brief: string; q4f16: number; q4: number }
const MODELS: Record<"LiquidAI/LFM2.5-1.2B-Instruct-ONNX" | "onnx-community/Qwen3-1.7B-ONNX" | "onnx-community/Qwen3-0.6B-ONNX", ModelInfo>;
const DEFAULT_MODEL = "onnx-community/Qwen3-0.6B-ONNX";
const DEFAULT_GPU_MODEL = DEFAULT_MODEL; // deprecated alias
const DEFAULT_CPU_MODEL = DEFAULT_MODEL; // deprecated alias
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `DEFAULT_MODEL` (Qwen3 0.6B) | The model to start with: a transformers.js text-generation model id. |
| `models` | `readonly string[]` | `[model]` | The models the person may pick from in the chat, each shown with its label, brief, size and whether it is already on the device. The last choice is remembered in localStorage (`web-agents:local-model:choice`) and wins over `model` on the next visit. |
| `dtype` | `"q4f16" \| "q4"` | `q4f16` on WebGPU with `shader-f16`, `q4` otherwise | Quantization. |
| `worker` | `Worker \| (() => Worker)` | the package's own worker | Pass one when your bundler can't follow `new Worker(new URL(…, import.meta.url))`. See [worker](./worker.md). |
| `maxInputTokens` | `number` | `3072` for models up to 650 MB, `1536` above | Most prompt tokens per generation (estimated at about 3.5 characters per token). The loop offers fewer tools and less history to stay under it. |

`MODELS` holds, for each known model, a `label` and a one-sentence `brief` for the picker and the sizes in bytes per
dtype (weights and tokenizer, from the model cards). A model not in `MODELS` still works: its label is the last path
segment of the id, its brief is generic, no size is shown and the memory check doesn't apply.

## Returns

A [`LocalProvider`](./provider-types.md#localprovider) with `id: "transformers"`, `label: "On-device"`, and
`callFormat` `"pythonic"` for LFM2 models, `"tags"` otherwise.

- `availability()`: `unavailable` without Web Workers or WebAssembly, or when the model is too big for the device;
  `available` once loaded; otherwise `needs-download` with `bytes`, a `note` (no WebGPU) and `cached`. `cached` is
  answered by transformers.js itself in the worker (`ModelRegistry.is_pipeline_cached`, an exact per-file check for
  the dtype and device that would load), so a returning visitor never sees a Download button, and a model cached for
  another dtype does not count. Every model in `models` is checked, so the picker can say "on this device".
- `prepare(onProgress, signal)`: claims the page and the browser lock, then loads the model in the worker with
  progress from 0 to 1. Aborting terminates the worker (a partial download is re-fetched next time).
- `generate(req)`: runs in the worker with the chat template's tools, thinking off, greedy decoding, at most 384 new
  tokens. Stop interrupts it.
- `fits(req)`: estimated tokens of system prompt, messages and tools against `maxInputTokens`.
- `models()`: a `ModelChoice` per offered model (`selected` marks the current one, `recommended` the default).
- `selectModel(id)`: frees the current worker and switches; the next `availability()` describes the new model. Throws
  for an id not in `models`, and `Error [busy]` while a generation is running.
- `dispose()`: terminates the worker and releases the page slot and the lock.

## Freeze guards

A model on WebGPU holds hundreds of MB of GPU memory, shared with the whole system on Apple silicon. Two loaded copies,
or one long prompt on a large model, have frozen a Mac until restart. So the provider:

- **Loads one model per page.** Loading stops any other provider's model on the page (a second adapter, or the copy a
  hot reload left behind).
- **Loads one model per browser.** A Web Lock (`web-agents:local-model`) is shared by every tab of the origin. If
  another tab holds it past 1.5 s, `prepare()` fails with "The on-device model is already running in another tab. …"
  Browsers without Web Locks get no lock.
- **Checks device memory.** Models over 650 MB are refused when `navigator.deviceMemory` reports less than 8 GB.
  Without `deviceMemory`, nothing is refused.
- **Frees the model on `pagehide`** (the back/forward cache would otherwise keep it) and reloads it from the browser
  cache on the next message.
- **Caps the prompt** at `maxInputTokens`.

## Example

```ts
import { createLocalAdapter, createPromptApiProvider, createTransformersProvider } from "@webmcp-agents/local-agent";

const local = createLocalAdapter({
  providers: [
    createPromptApiProvider(),
    // trained for tool calling; needs a strong GPU and plenty of free memory
    createTransformersProvider({ model: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX", maxInputTokens: 1536 }),
  ],
});
```

## Notes

- Load errors that look like running out of memory (`bad_alloc`, `out of memory`, `Aborted(`) read as "this device
  doesn't have enough memory for the model. …"
- `onnx-community/Qwen3-1.7B-ONNX` is one 1.4 GB file; in testing creating its session ran out of memory, so it is
  opt-in.
- After the first download the page asks for persistent storage (`navigator.storage.persist()`), so a returning
  visitor loads from disk.
- WASM runs single-threaded unless the page is cross-origin isolated (COOP `same-origin` + COEP `require-corp`).
- The localStorage hint `web-agents:local-model` of earlier versions is gone: the cache check asks transformers.js, so
  cleared site data or a changed dtype can no longer make a cached model look uncached (or the reverse).

## See also

- [`createLocalAdapter`](./create-local-adapter.md)
- [worker](./worker.md)
- [`createPromptApiProvider`](./create-prompt-api-provider.md)
- [Provider types](./provider-types.md)
