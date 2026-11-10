---
description: "Turns a WebAgent into an AI SDK ToolLoopAgent for one request: the model (whose key lives on the server), the page's live tools and the agent's instructions exist together only there."
---

# `toToolLoopAgent`

Turns a `WebAgent` into an AI SDK `ToolLoopAgent` for one request: the model (whose key lives on the server), the page's live tools and the agent's instructions exist together only there. [`createChatHandler`](./create-chat-handler.md) does this for every POST; reach for these functions to run a `WebAgent` inside your own AI SDK code, or to inspect the settings the handler builds.

## Import

```ts
import {
  toToolLoopAgent,
  toToolLoopAgentSettings,
  toToolSet,
} from "@webmcp-agents/chat/server";
import type {
  ToToolLoopAgentOptions,
  WebAgentSettings,
} from "@webmcp-agents/chat/server";
```

## Example

Build the agent for the shopper with the tools a page sent, and run it once. The model is one step per request: a tool call comes back for the browser to run.

<include meta='title="run-agent.ts"'>/_examples/shared/reference/chat/to-tool-loop-agent.ts</include>

To tune the agent the handler builds instead (telemetry, `prepareStep`, middleware), pass [`prepareAgent`](./create-chat-handler.md#options) to `createChatHandler`.

## Options

`toToolLoopAgent(agent, options)` and `toToolLoopAgentSettings(agent, options)` take the agent (or `undefined` for the plain assistant) and a `ToToolLoopAgentOptions`.

| Name | Type | Default | Description |
|---|---|---|---|
| `agent` | `WebAgent \| undefined` | required | The agent from [`defineWebAgent`](./define-web-agent.md), or `undefined` for the plain assistant: the base prompt, every page tool, no delegation note. |
| `model` | `LanguageModel` | required | The resolved model: see [`resolveModel`](./resolve-model.md). |
| `tools` | `readonly ToolDescriptor[]` | required | The page's tools right now, as the request carried them. [`selectTools(agent, tools)`](./define-web-agent.md#helpers) is applied: the agent's filter, plus its delegate tools. |
| `path` | `string` | not set | The page's same-origin path, for the "The user is on the page …" line. |
| `base` | `string` | `DEFAULT_SYSTEM_PROMPT` | The base system prompt: see [`buildSystemPrompt`](./system-prompt.md). |
| `extraInstructions` | `string` | not set | Appended after the instructions, for example a tool-budget note (the handler passes one once the step budget is spent). |
| `maxOutputTokens` | `number` | not set | Output token cap per step, passed through. |
| `providerOptions` | AI SDK `providerOptions` | not set | Passed through: see [`providerOptionsFor`](./resolve-model.md). |
| `stopWhen` | AI SDK `stopWhen` | `stepCountIs(1)` | When the loop stops. One model step per request, because the browser runs the tools in between. |
| `toolSet` | `ToolSet` | not set | Replaces the tool set entirely (the handler passes `{}` once the step budget is spent). |

## Returns

- `toToolLoopAgentSettings` returns `WebAgentSettings`: `{ id: agent?.id, model, instructions, tools, stopWhen, maxOutputTokens, providerOptions }`. `instructions` is `buildSystemPrompt(base, path, agent?.instructions, agent has sub-agents)` plus `extraInstructions`; `tools` is `toToolSet(selectTools(agent, tools))`.
- `toToolLoopAgent` returns `new ToolLoopAgent(settings)`.
- `toToolSet(tools)` returns the page's tools as an AI SDK tool set **without `execute`** (the browser runs them), with control characters stripped from descriptions and `$schema` and `$id` removed from schemas.

## Notes

- In the normal flow nobody constructs the `ToolLoopAgent` themselves: `defineWebAgent` is the definition and `createChatHandler` the runtime. This is the seam between the two.
- Because tools have no `execute`, a call ends the step; the browser runs the tool and posts the result with the next request.
- `ToolDescriptor` is exported from `@webmcp-agents/chat`, not from `/server`.

## See also

- [Define an agent](../../build/define-an-agent.mdx), the page that teaches agents
- [`defineWebAgent`](./define-web-agent.md)
- [`createChatHandler`](./create-chat-handler.md) and its `prepareAgent` option
- [`buildSystemPrompt`](./system-prompt.md)
