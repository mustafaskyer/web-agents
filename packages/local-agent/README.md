# @web-agents/local-agent

An on-device agent for [`@web-agents/chat`](../chat): the model runs in the visitor's browser. No server, no API key,
and nothing the user types leaves the device.

```tsx
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import { createLocalAdapter } from "@web-agents/local-agent";

const ADAPTERS = [createCloudAdapter(), createLocalAdapter()]; // once per page
<AgentChat adapters={ADAPTERS} />                              // a switcher: Claude (cloud) | On-device
```

## Vite

The model runs in a module Web Worker that the package creates with `new Worker(new URL(…, import.meta.url))`. Vite
must see that unbundled:

```ts
export default defineConfig({
  optimizeDeps: { exclude: ["@web-agents/local-agent", "@huggingface/transformers"] },
  worker: { format: "es" },
});
```

If your bundler can't follow the worker URL, pass the worker yourself:
`createLocalAdapter({ worker: () => new Worker(new URL("@web-agents/local-agent/worker", import.meta.url), { type: "module" }) })`
(or Vite's `import LocalWorker from "@web-agents/local-agent/worker?worker"` → `worker: () => new LocalWorker()`).

## Providers (first available wins)

| Provider | When | Download |
|---|---|---|
| Chrome built-in (Prompt API, `LanguageModel`) | Desktop Chrome with the built-in model | none per site (Chrome manages it) |
| transformers.js 4 + WebGPU | WebGPU available | Qwen3 0.6B ONNX, q4f16: ~585 MB |
| transformers.js 4 + WASM | no WebGPU | Qwen3 0.6B ONNX, q4: ~934 MB (slower) |

`model: "onnx-community/Qwen3-1.7B-ONNX"` is better at tool calls but is one 1.4 GB ONNX file: in testing (headless
Chromium) creating its session ran out of memory (`std::bad_alloc`), so it's opt-in. An out-of-memory load shows as a
plain "not enough memory" message with the cloud assistant as the way out.

Sizes are from the `onnx-community` model cards (weights + tokenizer). Files are kept in the browser's Cache API
(`transformers-cache`) and the page asks for persistent storage after the first download: a returning visitor loads
from disk. WASM runs single-threaded unless the page is cross-origin isolated (COOP `same-origin` + COEP
`require-corp`), which makes it several times faster.

## How it behaves

- **Consent first.** Nothing downloads until the person clicks Download in the chat (the card shows the size).
  Progress is determinate; Cancel stops it (the worker is terminated).
- **Off the main thread.** transformers.js and ONNX Runtime load only inside the worker, so generation never janks
  the page or the agent cursor. The main bundle doesn't include them.
- **Small-model guard rails.** At most 8 tools per step, ranked against the request, with compact schemas; Qwen3
  thinking off, greedy decoding; tool calls parsed leniently (`<tool_call>`, fenced JSON, Prompt API JSON), checked
  against the schema, and fed back once if wrong; at most 4 steps, 60 s per step, and a stop after the same call
  twice in a row.
- **Prompt API:** tool calls come from JSON-constrained output (`responseConstraint`). The API's native tools run
  their `execute` inside `prompt()`, which would bypass the loop's validation and the cursor's pacing.

## Limits

0.6B–1.7B models handle one explicit action well ("add 2 mugs to the cart") and multi-step plans poorly. Offer the
cloud assistant next to it for anything bigger. The Prompt API is desktop-Chrome-only and still changes shape
between versions; every call is guarded, and anything unexpected reads as "unavailable".

## API

`createLocalAdapter({ providers?, model?, worker?, maxSteps = 4, stepTimeoutMs = 60_000, label = "On-device" })`,
`detectLocalProviders()`, `createTransformersProvider({ model?, dtype?, worker? })`, `createPromptApiProvider()`,
and the loop pieces (`runLocalAgent`, `parseToolCalls`, `rankTools`, `compactSchema`, `validateArgs`) for building
your own provider (implement `LocalProvider`: `availability()`, `prepare(onProgress, signal)`, `generate(req)`).
