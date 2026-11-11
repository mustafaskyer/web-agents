---
slug: reference/local-agent
description: "An on-device agent for @webmcp-agents/chat: the model runs in the visitor's browser."
---

# `@webmcp-agents/local-agent`

An on-device agent for [`@webmcp-agents/chat`](../chat/README.md): the model runs in the visitor's browser. No server, no
API key, and nothing the user types leaves the device. It implements the same
[adapter contract](../chat/adapter-types.md) as the cloud adapter, so `<AgentChat>` shows both behind a switcher.

## Install

```bash
pnpm add @webmcp-agents/local-agent @webmcp-agents/chat
```

`@webmcp-agents/chat` is a peer dependency. `@huggingface/transformers` is a dependency, loaded only inside the worker.

```tsx
import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter } from "@webmcp-agents/local-agent";

const ADAPTERS = [createCloudAdapter(), createLocalAdapter()]; // once per page
<AgentChat adapters={ADAPTERS} />                              // a switcher: Claude (cloud) | On-device
```

With Vite, let it see the worker unbundled:

```ts vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ["@webmcp-agents/local-agent", "@huggingface/transformers"] },
  worker: { format: "es" },
});
```

## Entry points

| Import | What |
|---|---|
| `@webmcp-agents/local-agent` | The adapter, providers, the agent loop and its helpers, provider types |
| `@webmcp-agents/local-agent/worker` | The transformers.js model worker |

## Providers (first available wins)

| Provider | When | Download |
|---|---|---|
| Chrome built-in (Prompt API, `LanguageModel`) | Desktop Chrome with the built-in model | none per site (Chrome manages it) |
| transformers.js + WebGPU | WebGPU available | Qwen3 0.6B ONNX, q4f16: about 585 MB |
| transformers.js + WASM | no WebGPU | Qwen3 0.6B ONNX, q4: about 934 MB (slower) |

Nothing downloads until the person clicks Download in the chat; the card shows the size, progress, and Cancel. Files
stay in the browser's Cache API, so a returning visitor loads from disk without a second click.

## API

| API | What it is |
|---|---|
| [`createLocalAdapter`](./create-local-adapter.md) | The on-device `AgentAdapter` for `<AgentChat>`: picks a provider, handles download consent and caching. |
| [`createTransformersProvider`](./create-transformers-provider.md) | The transformers.js engine: which models, quantization, the freeze guards. Includes `TransformersProviderOptions`, `MODELS`, `DEFAULT_MODEL`. |
| [`createPromptApiProvider`](./create-prompt-api-provider.md) | The engine backed by Chrome's built-in model. |
| [`detectLocalProviders`](./detect-local-providers.md) | Each provider's availability right now, for a settings screen. |
| [`runLocalAgent`](./run-local-agent.md) | The agent loop around any provider. Includes `LocalLoopOptions`. |
| [Provider types](./provider-types.md) | The contract for your own engine: `LocalProvider`, `ProviderAvailability`, `CallFormat`, `CompactTool`, `ChatTurn`, `GenerateRequest`, `GenerateResult`. |
| [`parseToolCalls`, `createProseFilter`](./tool-call-parser.md) | Tool calls out of a small model's free text. Includes `ParsedCall`, `ParseResult`. |
| [`rankTools`, `compactSchema`, `validateArgs`](./tools.md) | Short tool lists, short schemas, and a check of a call's arguments. |
| [`@webmcp-agents/local-agent/worker`](./worker.md) | The transformers.js model worker, for bundlers that cannot find it themselves. |

## Limits

0.6B to 1.7B models handle one explicit action well ("add 2 mugs to the cart") and multi-step plans poorly. Offer the
cloud assistant next to it for anything bigger, and give the site's flow in a few lines of `instructions`. The Prompt
API is desktop-Chrome-only and still changes shape between versions; anything unexpected reads as unavailable.

## See also

- [`@webmcp-agents/chat`](../chat/README.md)
- [Tool error codes](../core/tool-error.md)
