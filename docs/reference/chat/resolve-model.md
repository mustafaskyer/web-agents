---
description: "Turns one string, \"<provider>/<model>\", into an AI SDK LanguageModel for any frontier model."
---

# `resolveModel`

Turns one string, `"<provider>/<model>"`, into an AI SDK `LanguageModel` for any frontier model. Use it on the server when you build the model yourself; [`createChatHandler`](./create-chat-handler.md) uses it for its `model` option and for each agent's `model`. The provider's own AI SDK package is used when its key is set (the package is an optional peer, loaded only then); otherwise the AI Gateway built into `ai` serves any `a/b` id with `AI_GATEWAY_API_KEY`. A bare `claude-…` id still means Anthropic.

## Import

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
```

The types:

```ts
import type {
  ModelAvailability,
  ParsedModelId,
  ProviderOptions,
  ProviderSpec,
  ReasoningLevel,
} from "@webmcp-agents/chat/server";
```

## Example

Check that a model can run, build it, and spell a reasoning level the provider's way.

<include meta='title="model.ts"'>/_examples/shared/reference/chat/resolve-model.ts</include>

In `.env.local` (server side only), a model and its key:

```bash .env.local
WEB_AGENTS_MODEL=openrouter/anthropic/claude-opus-5.5
OPENROUTER_API_KEY=sk-or-…
```

## Options

`resolveModel(id, env)`:

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | required | The model, `"<provider>/<model>"` (for example `openai/gpt-5.5`), or a bare `claude-…` id for Anthropic. |
| `env` | `Record<string, string \| undefined>` | required | Where the keys are read, usually `process.env`. |

### Providers

The prefix picks the provider. The provider's key wins; its package is an optional peer you install on the server.

| Prefix | Package | Env var | Reasoning option |
|---|---|---|---|
| `anthropic/` (and bare `claude-*`) | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` | `effort` + `fallbacks: "default"` |
| `openai/` | `@ai-sdk/openai` | `OPENAI_API_KEY` | `reasoningEffort` (`minimal` for `off`), `reasoningSummary: "auto"` |
| `google/` | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` | `thinkingConfig.thinkingLevel` (`minimal` for `off`), `includeThoughts` |
| `deepseek/` | `@ai-sdk/deepseek` | `DEEPSEEK_API_KEY` | `reasoningEffort` for `low` and `high` only |
| `xai/` | `@ai-sdk/xai` | `XAI_API_KEY` | `reasoningEffort` (`none` for `off`), `reasoningSummary: "auto"` |
| `mistral/` | `@ai-sdk/mistral` | `MISTRAL_API_KEY` | `reasoningEffort` (`none` for `off`) |
| `openrouter/<vendor>/<model>` | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` | `reasoning: { effort }` (none for `off`) |
| any other `a/b` id | none: `createGateway` from `ai` | `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN`) | the upstream provider's object, keyed by the prefix |

Option names were checked against the installed SDKs on 2026-11-08 (`@ai-sdk/openai` 4.0, `google` 4.0, `xai` 5.0, `deepseek` 3.0, `mistral` 4.0, `@openrouter/ai-sdk-provider` 3.1). `PROVIDERS` exports this table as `Record<string, ProviderSpec>` (`id`, `pkg`, `envKey`, `label`, `load`, `reasoning`); adding a provider means adding a spec to it in this package.

### The other functions

| Function | Description |
|---|---|
| `modelAvailability(id, env)` | `ModelAvailability`, synchronously and without loading an SDK: `{ enabled, provider, missingEnv, message, viaGateway }`. `message` names the env var(s) that would enable the id (`"Set OPENAI_API_KEY or AI_GATEWAY_API_KEY on the server to use openai/gpt-5.5."`). With only `OPENROUTER_API_KEY` set and a bare vendor id, it suggests the `openrouter/` form. |
| `parseModelId(id)` | `ParsedModelId`: `{ provider, model, id }`. Splits at the **first** slash, so `openrouter/anthropic/claude-opus-5.5` is provider `openrouter`, model `anthropic/claude-opus-5.5`. A bare id is Anthropic's; an unknown prefix is provider `"gateway"`. Throws a `TypeError` when nothing follows the slash. |
| `providerOptionsFor(provider, level, id?)` | The `providerOptions` for a `ReasoningLevel` (`"off"`, `"low"`, `"medium"` or `"high"`), spelled the provider's way and keyed by its id; `undefined` when the provider has no such knob. Through the gateway (`provider` is `"gateway"`), pass `id`: the upstream provider's object is keyed by the id's prefix. |
| `displayName(id)` | A readable name: `anthropic/claude-opus-5-5` is "Claude Opus 5.5", `openai/gpt-5.5` is "GPT-5.5", `openrouter/deepseek/deepseek-v4` is "DeepSeek V4 via OpenRouter". Also exported from `@webmcp-agents/chat`; the cloud adapter labels itself with it. |

## Returns

`resolveModel` resolves to `{ model: LanguageModel; provider: string }`. It rejects with a `ModelUnavailableError` (`code`: `"missing_env"`, `"missing_package"` or `"unknown_provider"`) when the key is missing, the package is not installed (`"Install @ai-sdk/openai on the server to use openai/gpt-5.5 …"`) or the prefix is unknown and no gateway key is set.

## Notes

- The provider's key wins. Without it, a gateway key serves any slash id, except `openrouter/` ids (OpenRouter's own catalog) and bare ids: gateway ids use dots (`anthropic/claude-opus-5.5`) and SDK ids use dashes (`claude-opus-5-5`), so an id is never rerouted between the two catalogs.
- `resolveModel` loads a provider's package with a literal `import()` once per key and caches the factory, so a bundler and Vercel's tracer follow it.
- `createChatHandler` reports the resolved `provider` in its `GET` answer.

## See also

- [Add the chat](../../build/add-the-chat.mdx), where the model is chosen
- [`createChatHandler`](./create-chat-handler.md), the `model` and `reasoning` options
- [`createCloudAdapter`](./create-cloud-adapter.md), which labels itself with `displayName`
- [Deploy](../../more/deploy.md), the env vars
