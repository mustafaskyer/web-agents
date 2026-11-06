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

`model: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX"` (q4f16 ~764 MB) is trained for tool calling and, in testing, finished a
multi-step task ("find the trail cap and add it to the cart") that Qwen3 0.6B couldn't. Its calls are pythonic
(`<|tool_call_start|>[open_product(slug="trail-cap")]<|tool_call_end|>`), which the parser reads and the history
writes back. It's opt-in: it needs a strong GPU and plenty of free memory (see "Not freezing the machine").

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
  against the schema, and fed back once if wrong; after each step's tool calls, the request is restated so a small
  model continues it (or says it's done) instead of echoing the last result; at most 6 steps, 60 s per step, and a stop after the same call
  twice in a row.
- **Prompt API:** tool calls come from JSON-constrained output (`responseConstraint`). The API's native tools run
  their `execute` inside `prompt()`, which would bypass the loop's validation and the cursor's pacing.

## Not freezing the machine

A model on WebGPU holds hundreds of MB of GPU memory, shared with the whole system on Apple silicon, and the GPU can't
be interrupted while it reads a prompt. Two loaded copies, or one long prompt on a large model, have frozen a Mac
until restart. So the transformers.js provider:

- **loads one model per page**: loading stops any other provider's model on the page (a second adapter, or the copy a
  hot reload left behind);
- **loads one model per browser**: a Web Lock shared by every tab of the origin; a second tab gets "already running
  in another tab" instead of a second copy;
- **frees the model on `pagehide`** (a page in the back/forward cache would otherwise keep it), and reloads it from the
  browser cache on the next message;
- **refuses models over 650 MB** when `navigator.deviceMemory` reports less than 8 GB;
- **caps the prompt** at `maxInputTokens` (default 1536, estimated): the loop offers fewer tools, then less history,
  until it fits. Chrome's built-in model does the same against its own window (`contextWindow`, ~1000 tokens on some
  devices).

## Limits

0.6B–1.7B models handle one explicit action well ("add 2 mugs to the cart") and multi-step plans poorly. Offer the
cloud assistant next to it for anything bigger. The Prompt API is desktop-Chrome-only and still changes shape
between versions; every call is guarded, and anything unexpected reads as "unavailable".

## API

`createLocalAdapter({ providers?, model?, worker?, maxSteps = 6, stepTimeoutMs = 60_000, label = "On-device" })`,
`detectLocalProviders()`, `createTransformersProvider({ model?, dtype?, worker?, maxInputTokens = 1536 })`, `createPromptApiProvider()`,
and the loop pieces (`runLocalAgent`, `parseToolCalls`, `rankTools`, `compactSchema`, `validateArgs`) for building
your own provider (implement `LocalProvider`: `availability()`, `prepare(onProgress, signal)`, `generate(req)`).
