---
description: "The contract between the on-device agent loop and the engines that run a model."
---

# Provider types

The contract between the on-device agent loop and the engines that run a model. A provider only generates; the loop owns tools, validation and the conversation. Implement `LocalProvider` to plug in your own engine, then hand it to [`createLocalAdapter({ providers })`](./create-local-adapter.md) or [`runLocalAgent`](./run-local-agent.md).

## Import

```ts
import type {
  CallFormat,
  ChatTurn,
  CompactTool,
  GenerateRequest,
  GenerateResult,
  LocalProvider,
  ProviderAvailability,
} from "@webmcp-agents/local-agent";
```

## Example

A provider that only echoes, which is enough to see the contract:

<include meta='title="echo-provider.ts"'>/_examples/shared/reference/local-agent/provider-types.ts</include>

## Options

The members of each type, one table per type.

### `LocalProvider`

An engine that can run a model in this browser.

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `"transformers" \| "prompt-api" \| string` | required | Identifies the provider, e.g. in [`detectLocalProviders`](./detect-local-providers.md). |
| `label` | `string` | required | A human name for the provider. |
| `toolsInline` | `boolean` | `false` | List the tools in the prompt text, for engines with no chat-template tools support; replies then use a JSON format. |
| `callFormat` | `CallFormat` | `"tags"` | How the model writes tool calls, and so how its earlier calls go back into the history. |
| `broken` | `string` | not set | Set once the provider found it cannot run here after all; the adapter then moves on to the next provider. |
| `availability` | `() => Promise<ProviderAvailability>` | required | Whether it can run, and what it needs first. Must not download anything. |
| `prepare` | `(onProgress: (progress: number) => void, signal?: AbortSignal) => Promise<void>` | required | Download and load the model. `onProgress` gets 0 to 1. Aborting stops the download. Called from the person's click. |
| `generate` | `(req: GenerateRequest) => Promise<GenerateResult>` | required | One generation: raw text for the loop to parse tool calls out of. |
| `fits` | `(req: Pick<GenerateRequest, "system" \| "messages" \| "tools">) => Promise<boolean>` | everything fits | Whether a prompt fits the model's input window, with room left for the reply. The loop then offers fewer tools and less history until it does. |
| `models` | `() => readonly ModelChoice[]` | no choice | The models this provider offers, for the chat's picker (see `AgentAdapter.models`). |
| `selectModel` | `(id: string) => Promise<void>` | one model | Switch to one of `models()`: frees the current model; `availability()` then describes the new one. |
| `dispose` | `() => void` | not said | Free the model (terminate the worker, destroy the session). |

### `GenerateRequest`

| Name | Type | Default | Description |
|---|---|---|---|
| `system` | `string` | required | The system prompt. |
| `messages` | `ChatTurn[]` | required | The conversation, as chat-template turns. |
| `tools` | `CompactTool[]` | required | At most a handful, compacted (see [`rankTools`](./tools.md)). |
| `signal` | `AbortSignal` | required | Aborts when the person presses Stop or the step times out. |
| `onToken` | `(delta: string) => void` | not set | Raw text as it is generated; the loop filters tool-call markup out. |

### `GenerateResult`

| Name | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | required | The raw reply. The loop parses tool calls out of it. |

### `ChatTurn`

A turn of the prompt. `tool` turns carry a tool's result back to the model.

| Name | Type | Default | Description |
|---|---|---|---|
| `role` | `"user" \| "assistant" \| "tool"` | required | Who wrote it. |
| `content` | `string` | required | The text of the turn. |
| `name` | `string` | not set | The tool's name, on `tool` turns. |

### `CompactTool`

A tool as small models see it: a short description and a compact schema.

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | The tool's name. |
| `description` | `string` | required | Cut to 400 characters. |
| `parameters` | `JSONSchema` | required | The input schema, through [`compactSchema`](./tools.md). |

### `ProviderAvailability`

A union on `state`:

| State | Fields | Meaning |
|---|---|---|
| `"available"` | none | Ready to generate. |
| `"needs-download"` | `bytes?`, `note?`, `cached?` | A download is needed first. `cached: true` means it was downloaded before, so the person already agreed: it loads from the browser cache on first use, with no click. |
| `"downloading"` | `progress` | A download is in progress (0 to 1). |
| `"unavailable"` | `reason` | It cannot run here; `reason` says why. |

### `CallFormat`

`"tags"` is `<tool_call>{json}</tool_call>` (Qwen, Hermes); `"pythonic"` is `<|tool_call_start|>[name(arg="x")]<|tool_call_end|>` (Liquid LFM2).

## Notes

- `generate` should honour `req.signal`. The loop also races it against Stop and the step timeout, so a provider that ignores it cannot hang the run.
- Setting `broken` and then throwing from `generate` makes `createLocalAdapter` switch providers instead of showing the error.
- `models()` and `selectModel()` are optional: a provider that runs one model leaves them out, and the chat shows no picker.

## See also

- [On-device agent](../../more/on-device-agent.mdx)
- [`runLocalAgent`](./run-local-agent.md)
- [`createLocalAdapter`](./create-local-adapter.md)
- [`createTransformersProvider`](./create-transformers-provider.md) and [`createPromptApiProvider`](./create-prompt-api-provider.md)
