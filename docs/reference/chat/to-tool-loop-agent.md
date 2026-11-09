# `toToolLoopAgent`

A `WebAgent` as an AI SDK `ToolLoopAgent`, built for one request: the model (whose key lives on the server), the page's
live tools and the agent's instructions exist together only there. `createChatHandler` does this for every POST;
these functions are for running a `WebAgent` inside your own AI SDK code.

```ts
import { toToolLoopAgent, toToolLoopAgentSettings, toToolSet } from "@webmcp-agents/chat/server";
import type { ToToolLoopAgentOptions, WebAgentSettings } from "@webmcp-agents/chat/server";
```

## Signature

```ts
function toToolLoopAgentSettings(
  agent: WebAgent | undefined,
  options: ToToolLoopAgentOptions,
): WebAgentSettings;

function toToolLoopAgent(
  agent: WebAgent | undefined,
  options: ToToolLoopAgentOptions,
): ToolLoopAgent<never, ToolSet>;
function toToolSet(tools: readonly ToolDescriptor[]): ToolSet;

type WebAgentSettings = ToolLoopAgentSettings<never, ToolSet>;

interface ToToolLoopAgentOptions {
  model: LanguageModel;
  tools: readonly ToolDescriptor[];
  path?: string;
  base?: string;
  extraInstructions?: string;
  maxOutputTokens?: number;
  providerOptions?: ToolLoopAgentSettings["providerOptions"];
  stopWhen?: ToolLoopAgentSettings["stopWhen"];
  toolSet?: ToolSet;
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `model` | `LanguageModel` | — | The resolved model (see [`resolveModel`](./resolve-model.md)). |
| `tools` | `readonly ToolDescriptor[]` | — | The page's tools right now. `selectTools(agent, tools)` is applied: the agent's filter, plus its delegate tools. |
| `path` | `string` | — | The page's same-origin path, for the "The user is on the page …" line. |
| `base` | `string` | `DEFAULT_SYSTEM_PROMPT` | The base system prompt. |
| `extraInstructions` | `string` | — | Appended last (the handler passes the tool-budget note). |
| `maxOutputTokens` | `number` | — | Passed through. |
| `providerOptions` | | — | Passed through (see [`providerOptionsFor`](./resolve-model.md)). |
| `stopWhen` | | `stepCountIs(1)` | One model step per request: the browser runs the tools in between. |
| `toolSet` | `ToolSet` | — | Replaces the tool set entirely (the handler passes `{}` once the step budget is spent). |

## Returns

- `toToolLoopAgentSettings`: `{ id: agent?.id, model, instructions, tools, stopWhen, maxOutputTokens, providerOptions }`
  where `instructions` = `buildSystemPrompt(base, path, agent?.instructions, agent has sub-agents)` (+
  `extraInstructions`) and `tools` = `toToolSet(selectTools(agent, tools))`.
- `toToolLoopAgent`: `new ToolLoopAgent(settings)`.
- `toToolSet`: page tools as an AI SDK tool set **without `execute`** (the browser runs them), descriptions with
  control characters stripped, schemas without `$schema` / `$id`.

## Example

```ts
import { ToolLoopAgent } from "ai";
import { resolveModel, toToolLoopAgent } from "@webmcp-agents/chat/server";
import { shopper } from "./agents";

const { model } = await resolveModel("anthropic/claude-opus-5-5", process.env);
const loop = toToolLoopAgent(shopper, { model, tools: pageTools, path: "/cart" });
const result = await loop.stream({ messages });     // an AI SDK ToolLoopAgent: stream(), generate(), …
```

To tune the agent the handler builds instead (telemetry, `prepareStep`, middleware), use
`createChatHandler({ prepareAgent })`.

## Notes

- Users never construct the `ToolLoopAgent` themselves in the normal flow: `defineWebAgent` is the definition,
  `createChatHandler` the runtime. This is the seam between the two.
- With `agent` undefined you get the plain assistant: the base prompt, every page tool, no delegation note.

## See also

- [`defineWebAgent`](./define-web-agent.md)
- [`createChatHandler`](./create-chat-handler.md)
- [`buildSystemPrompt`](./system-prompt.md)
