# `resolveModel`

Any frontier model from one string: `"<provider>/<model>"`. The provider's own AI SDK package is used when its key is
set (the package is an optional peer, loaded only then); otherwise the AI Gateway built into `ai` serves any `a/b` id
with `AI_GATEWAY_API_KEY`. A bare `claude-…` id still means Anthropic.

```ts
import {
  displayName,
  ModelUnavailableError,
  modelAvailability,
  parseModelId,
  PROVIDERS,
  providerOptionsFor,
  resolveModel,
} from "@webmcp-agents/chat/server";
import type { ModelAvailability, ParsedModelId, ProviderOptions, ProviderSpec, ReasoningLevel } from "@webmcp-agents/chat/server";
```

## Signature

```ts
type Env = Record<string, string | undefined>;

async function resolveModel(id: string, env: Env): Promise<{ model: LanguageModel; provider: string }>;
function modelAvailability(id: string, env: Env): ModelAvailability; // sync; never loads an SDK
function parseModelId(id: string): ParsedModelId;
function providerOptionsFor(provider: string, level: ReasoningLevel, id?: string): ProviderOptions | undefined;
function displayName(id: string): string; // also exported from "@webmcp-agents/chat"

type ReasoningLevel = "off" | "low" | "medium" | "high";

interface ParsedModelId {
  provider: string;
  model: string;
  id: string;
}

interface ModelAvailability {
  enabled: boolean;
  provider: string;
  missingEnv: string[];
  message: string;
  viaGateway: boolean;
}

class ModelUnavailableError extends Error {
  code: "missing_env" | "missing_package" | "unknown_provider";
}

const PROVIDERS: Record<string, ProviderSpec>;
```

## Providers

| Prefix | Package (optional peer, install it on the server) | Env var | Reasoning option |
|---|---|---|---|
| `anthropic/` (and bare `claude-*`) | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` | `effort` + `fallbacks: "default"` |
| `openai/` | `@ai-sdk/openai` | `OPENAI_API_KEY` | `reasoningEffort` (`minimal` for `off`), `reasoningSummary: "auto"` |
| `google/` | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` | `thinkingConfig.thinkingLevel` (`minimal` for `off`), `includeThoughts` |
| `deepseek/` | `@ai-sdk/deepseek` | `DEEPSEEK_API_KEY` | `reasoningEffort` for `low` / `high` only |
| `xai/` | `@ai-sdk/xai` | `XAI_API_KEY` | `reasoningEffort` (`none` for `off`), `reasoningSummary: "auto"` |
| `mistral/` | `@ai-sdk/mistral` | `MISTRAL_API_KEY` | `reasoningEffort` (`none` for `off`) |
| `openrouter/<vendor>/<model>` | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` | `reasoning: { effort }` (none for `off`) |
| any other `a/b` id | none: `createGateway` from `ai` | `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN`) | the upstream provider's object, keyed by the prefix |

Rules:

- `parseModelId` splits at the **first** slash: `openrouter/anthropic/claude-opus-5.5` is provider `openrouter`, model
  `anthropic/claude-opus-5.5`. A bare id is Anthropic's. An unknown prefix is a gateway id.
- The provider's key wins. Without it, a gateway key serves any slash id, except `openrouter/` ids (OpenRouter's own
  catalog) and bare ids (gateway ids use dots, `anthropic/claude-opus-5.5`; SDK ids use dashes): an id is never
  rerouted between the two catalogs.
- `modelAvailability` is synchronous and names the env var(s) that would enable the id (`"Set OPENAI_API_KEY or
  AI_GATEWAY_API_KEY on the server to use openai/gpt-5.5."`). With only `OPENROUTER_API_KEY` set and a bare vendor id,
  it suggests the `openrouter/` form.
- `resolveModel` loads the package with a literal `import()` once per key and caches the factory. A missing package
  rejects with `ModelUnavailableError("Install @ai-sdk/openai on the server to use openai/gpt-5.5 …", "missing_package")`;
  a missing key with `"missing_env"`.
- `providerOptionsFor` spells the reasoning level the provider's way, keyed by its id. Through the gateway, pass the
  id: the upstream provider's object is keyed by the id's prefix. `undefined` when the provider has no such knob.
- `displayName`: `anthropic/claude-opus-5-5` → "Claude Opus 5.5", `openai/gpt-5.5` → "GPT-5.5",
  `openrouter/deepseek/deepseek-v4` → "DeepSeek V4 via OpenRouter". The cloud adapter labels itself with it.

Option names were checked against the installed SDKs on 2026-11-08 (`@ai-sdk/openai` 4.0, `google` 4.0, `xai` 5.0,
`deepseek` 3.0, `mistral` 4.0, `@openrouter/ai-sdk-provider` 3.1).

## Example

```bash
# .env.local (server side only)
WEB_AGENTS_MODEL=openrouter/anthropic/claude-opus-5.5
OPENROUTER_API_KEY=sk-or-…
```

```ts
const { model, provider } = await resolveModel("openai/gpt-5.5", process.env);
const options = providerOptionsFor(provider, "low");
// → { openai: { reasoningEffort: "low", reasoningSummary: "auto" } }
```

## Notes

- `PROVIDERS` is exported so a server can read the table (packages, env vars); adding a provider means adding a
  `ProviderSpec` to it in this package.
- `createChatHandler` uses these for its `model` option and for each agent's `model`; its GET reports `provider`.

## See also

- [`createChatHandler`](./create-chat-handler.md)
- [`createCloudAdapter`](./create-cloud-adapter.md): the label
- [Deploy to Vercel](../../guides/deploy.md): the env vars
