# `createTransformersProvider`

A `LocalProvider` that runs a small model with transformers.js in a module Web Worker, on WebGPU when there is an
adapter and on WASM otherwise. The worker starts on `prepare()` (the person's click), never on import, and
transformers.js loads only inside it, so generation never blocks the page or the agent cursor.

```ts
import { createTransformersProvider, DEFAULT_CPU_MODEL, DEFAULT_GPU_MODEL, MODELS } from "@webmcp-agents/local-agent";
import type { TransformersProviderOptions } from "@webmcp-agents/local-agent";
```

## Signature

```ts
function createTransformersProvider(opts?: TransformersProviderOptions): LocalProvider;

interface TransformersProviderOptions {
  model?: string;
  dtype?: "q4f16" | "q4";
  worker?: Worker | (() => Worker);
  maxInputTokens?: number;
}

const MODELS: {
  "LiquidAI/LFM2.5-1.2B-Instruct-ONNX": { q4f16: 763_800_000; q4: 853_600_000 };
  "onnx-community/Qwen3-1.7B-ONNX": { q4f16: 1_440_000_000; q4: 2_160_000_000 };
  "onnx-community/Qwen3-0.6B-ONNX": { q4f16: 585_000_000; q4: 934_000_000 };
};
const DEFAULT_GPU_MODEL = "onnx-community/Qwen3-0.6B-ONNX";
const DEFAULT_CPU_MODEL = "onnx-community/Qwen3-0.6B-ONNX";
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `DEFAULT_GPU_MODEL` on WebGPU, `DEFAULT_CPU_MODEL` on WASM | A transformers.js text-generation model id. |
| `dtype` | `"q4f16" \| "q4"` | `q4f16` on WebGPU with `shader-f16`, `q4` otherwise | Quantization. |
| `worker` | `Worker \| (() => Worker)` | the package's own worker | Pass one when your bundler can't follow `new Worker(new URL(…, import.meta.url))`. See [worker](./worker.md). |
| `maxInputTokens` | `number` | `3072` for models up to 650 MB, `1536` above | Most prompt tokens per generation (estimated at about 3.5 characters per token). The loop offers fewer tools and less history to stay under it. |

`MODELS` holds the known sizes in bytes (weights and tokenizer, from the model cards). A model not in `MODELS` has no
known size: the download card shows none and the memory check doesn't apply.

## Returns

A [`LocalProvider`](./provider-types.md#localprovider) with `id: "transformers"`, `label: "On-device"`, and
`callFormat` `"pythonic"` for LFM2 models, `"tags"` otherwise.

- `availability()`: `unavailable` without Web Workers or WebAssembly, or when the model is too big for the device;
  `available` once loaded; otherwise `needs-download` with `bytes`, a `note` (no WebGPU, or already on this device),
  and `cached: true` when the model was loaded before and its files are still in the `transformers-cache` store.
- `prepare(onProgress, signal)`: claims the page and the browser lock, then loads the model in the worker with
  progress from 0 to 1. Aborting terminates the worker (a partial download is re-fetched next time).
- `generate(req)`: runs in the worker with the chat template's tools, thinking off, greedy decoding, at most 384 new
  tokens. Stop interrupts it.
- `fits(req)`: estimated tokens of system prompt, messages and tools against `maxInputTokens`.
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
- The TSDoc on `model` says "Default: Qwen3 1.7B on WebGPU, 0.6B on WASM"; the code uses `DEFAULT_GPU_MODEL`, which is
  Qwen3 0.6B.

## See also

- [`createLocalAdapter`](./create-local-adapter.md)
- [worker](./worker.md)
- [`createPromptApiProvider`](./create-prompt-api-provider.md)
- [Provider types](./provider-types.md)
