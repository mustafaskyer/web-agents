# `@web-agents/local-agent`

An on-device agent for [`@web-agents/chat`](../chat/README.md): the model runs in the visitor's browser. No server, no
API key, and nothing the user types leaves the device. It implements the same
[adapter contract](../chat/adapter-types.md) as the cloud adapter, so `<AgentChat>` shows both behind a switcher.

## Install

```bash
pnpm add @web-agents/local-agent @web-agents/chat
```

`@web-agents/chat` is a peer dependency. `@huggingface/transformers` is a dependency, loaded only inside the worker.

```tsx
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import { createLocalAdapter } from "@web-agents/local-agent";

const ADAPTERS = [createCloudAdapter(), createLocalAdapter()]; // once per page
<AgentChat adapters={ADAPTERS} />                              // a switcher: Claude (cloud) | On-device
```

With Vite, let it see the worker unbundled:

```ts
export default defineConfig({
  optimizeDeps: { exclude: ["@web-agents/local-agent", "@huggingface/transformers"] },
  worker: { format: "es" },
});
```

## Entry points

| Import | What |
|---|---|
| `@web-agents/local-agent` | The adapter, providers, the agent loop and its helpers, provider types |
| `@web-agents/local-agent/worker` | The transformers.js model worker |

## Providers (first available wins)

| Provider | When | Download |
|---|---|---|
| Chrome built-in (Prompt API, `LanguageModel`) | Desktop Chrome with the built-in model | none per site (Chrome manages it) |
| transformers.js + WebGPU | WebGPU available | Qwen3 0.6B ONNX, q4f16: about 585 MB |
| transformers.js + WASM | no WebGPU | Qwen3 0.6B ONNX, q4: about 934 MB (slower) |

Nothing downloads until the person clicks Download in the chat; the card shows the size, progress, and Cancel. Files
stay in the browser's Cache API, so a returning visitor loads from disk without a second click.

## API

| API | File |
|---|---|
| `createLocalAdapter`, `LocalAdapterOptions` | [create-local-adapter.md](./create-local-adapter.md) |
| `detectLocalProviders` | [detect-local-providers.md](./detect-local-providers.md) |
| `runLocalAgent`, `LocalLoopOptions` | [run-local-agent.md](./run-local-agent.md) |
| `createPromptApiProvider` | [create-prompt-api-provider.md](./create-prompt-api-provider.md) |
| `createTransformersProvider`, `TransformersProviderOptions`, `MODELS`, `DEFAULT_GPU_MODEL`, `DEFAULT_CPU_MODEL` | [create-transformers-provider.md](./create-transformers-provider.md) |
| `parseToolCalls`, `createProseFilter`, `ParsedCall`, `ParseResult` | [tool-call-parser.md](./tool-call-parser.md) |
| `rankTools`, `compactSchema`, `validateArgs` | [tools.md](./tools.md) |
| `LocalProvider`, `ProviderAvailability`, `CallFormat`, `CompactTool`, `ChatTurn`, `GenerateRequest`, `GenerateResult` | [provider-types.md](./provider-types.md) |
| `@web-agents/local-agent/worker` | [worker.md](./worker.md) |

## Limits

0.6B to 1.7B models handle one explicit action well ("add 2 mugs to the cart") and multi-step plans poorly. Offer the
cloud assistant next to it for anything bigger, and give the site's flow in a few lines of `instructions`. The Prompt
API is desktop-Chrome-only and still changes shape between versions; anything unexpected reads as unavailable.

## See also

- [`@web-agents/chat`](../chat/README.md)
- [Tool error codes](../core/tool-error.md)
