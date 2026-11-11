---
description: "Defines an agent once for the browser and the server: what the assistant knows about the site, which of the page's tools it may use, its sub-agents and its model."
---

# `defineWebAgent`

Defines an agent once for the browser and the server: what the assistant knows about the site, which of the page's tools it may use, its sub-agents and its model. Use it when the chat needs instructions, a tool subset or sub-agents, or when you want to run an agent from code with `agent.invoke`. The result is plain frozen data (no DOM, no React, no AI SDK), so the same file is imported by the React tree, `vite.config.ts` and `api/chat.ts`.

## Import

```ts
import { defineWebAgent } from "@webmcp-agents/chat/agent";
import type { WebAgent, WebAgentConfig } from "@webmcp-agents/chat/agent";
```

Also exported from `@webmcp-agents/chat` and `@webmcp-agents/chat/server`. The helpers (`flattenWebAgents`, `selectTools`, `delegateTool`, `delegateToolName`, `isDelegateTool`, `DELEGATE_PREFIX`, `AGENT_ID`) and the result types (`WebAgentInvokeOptions`, `WebAgentResult`, `WebAgentStep`) come from the same entries.

## Example

A parent agent with a sub-agent. Catalog tools go in `tools` as objects, tools a component registers go in by id, and `agents` gives the parent a `delegate_to_orders` tool.

<include meta='title="agents.ts"'>/_examples/shared/agents.ts</include>

Run an agent from code, with no chat on the page (browser only):

```ts
const { text, steps } = await shopper.invoke(
  "Reorder my last purchase and stop at checkout.",
);
```

## Options

`defineWebAgent(config)` takes a `WebAgentConfig`.

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | required | The agent's name, 1 to 64 of `a-z A-Z 0-9 _ . -` (`"shopper"`). The browser sends it with each request and the server looks the agent up by it, so instructions never travel from the page. Unique across the whole tree of agents and sub-agents. |
| `description` | `string` | `"Hand a task to the <id> agent."` | For a sub-agent: what it does, in one sentence. It becomes part of the parent's `delegate_to_<id>` tool description, which is all the parent has to decide when to delegate. |
| `instructions` | `string \| readonly string[]` | required | What the site is and how its tools fit together: the flow they form, what to ask for, what to avoid. Lines are trimmed and empty ones dropped; at least one is required. Appended to the system prompt under "About this site" (on the server for the cloud, in the browser for an on-device model). |
| `tools` | `readonly (string \| WebTool)[] \| (tools: ToolDescriptor[]) => ToolDescriptor[]` | every tool on the page | Which of the page's tools this agent may use: tools from `defineWebTool` or tool ids, mixed freely, or a function over the page's current [tool descriptors](./adapter-types.md#tooldescriptor-and-tooloutput). A tool object stands for its id; a tool a component registers with `useWebTool` has no object to list, so name it by id. Page order is kept, a listed tool is used while it is registered, and unknown ids are ignored. Applied in the browser and on the server. |
| `agents` | `readonly WebAgent[]` | `[]` | Sub-agents, each from `defineWebAgent`. Each becomes a `delegate_to_<id>` tool on this agent. They run in the browser, under the cursor, on the same adapter. |
| `model` | `string` | the handler's model | A `"<provider>/<model>"` id the server resolves (see [`resolveModel`](./resolve-model.md)), for example a cheaper model for a narrow sub-agent. A string, never a key. |
| `maxSteps` | `number` | the adapter's, then the handler's | Model steps allowed per user message for this agent: a positive integer. Beats the adapter's and the handler's `maxSteps`. |

### `agent.invoke`

`agent.invoke(text, options?)` runs the agent on one message with no chat on the page. It calls the page's tools (the cursor moves, fields are typed, a confirm-gated tool waits for the person's click) until it answers. Each call is a fresh conversation. The options are a `WebAgentInvokeOptions`:

| Name | Type | Default | Description |
|---|---|---|---|
| `adapter` | `AgentAdapter` | one shared `createCloudAdapter()` | What runs the model: the same default as [`<AgentChat>`](./agent-chat.md) and [`useWebAgent`](./use-web-agent.md), your `/api/chat`. Pass a [local adapter](../local-agent/create-local-adapter.md) to run on the device. |
| `signal` | `AbortSignal` | not set | Aborting stops the run: the model, the tool in flight and any sub-agent. `invoke` then rejects with an `AbortError`. |
| `onStep` | `(step: WebAgentStep) => void` | not set | Called whenever a tool call starts, parks on the person's confirmation, or ends. For progress UI. |

## Returns

A frozen `WebAgent`: `instructions` as an array of lines, `agents` as an array (empty by default), `tools` as ids (tool objects replaced by their ids) or the filter function, the other fields as given, and `invoke`.

`defineWebAgent` throws a `TypeError` that names the fix for a bad `id`, empty `instructions`, a `maxSteps` that is not a positive integer, `tools` that is neither a list nor a function, a `tools` entry that is neither an id nor a tool from `defineWebTool`, an `agents` entry that did not come from `defineWebAgent`, or an id used twice anywhere in the tree. All are found at definition time, not per request.

### `agent.invoke` result

`invoke` resolves to a `WebAgentResult`:

| Name | Type | Description |
|---|---|---|
| `text` | `string` | The agent's answer: the text of its replies in this run, joined. |
| `steps` | `WebAgentStep[]` | Every tool call it made, in order, a sub-agent's included (with `agent` set to the sub-agent's id). |
| `messages` | `AgentMessage[]` | The whole conversation: the user's message, then the agent's replies with their tool calls. See [adapter types](./adapter-types.md#agentmessage-and-agentpart). |

A `WebAgentStep` is one tool call:

| Name | Type | Description |
|---|---|---|
| `id` | `string` | The call's id. |
| `tool` | `string` | The tool's name; `delegate_to_<id>` for a hand-off to a sub-agent. |
| `input` | `unknown` | The arguments the model sent. |
| `state` | `ToolCallState` | `running`, `awaiting-confirmation` (parked on the page until the person clicks), `done`, `error` or `cancelled`. |
| `output` | `ToolOutput` | The tool's result, once done. |
| `error` | `string` | The error's text, when the call failed or was cancelled. |
| `prompt` | `string` | While awaiting confirmation: what the person should click. |
| `agent` | `string` | The sub-agent that made the call, when it was not the agent itself. |

### Helpers

| Name | Type | Description |
|---|---|---|
| `flattenWebAgents(agents)` | `(readonly WebAgent[]) => Map<string, WebAgent>` | Every agent and sub-agent by id. Throws on a duplicate id. The handler builds its registry with it. |
| `selectTools(agent, tools)` | `(WebAgent \| undefined, readonly ToolDescriptor[]) => ToolDescriptor[]` | What the model sees: drops incoming `delegate_to_*` descriptors (the server rebuilds them from its own registry), applies `agent.tools`, then appends one `delegateTool(sub)` per sub-agent (a delegate wins a name clash). With no agent, the page's tools as they are. |
| `delegateTool(sub)` | `(WebAgent) => ToolDescriptor` | The descriptor a parent sees for `sub`. Input `{ task: string (required), context?: string }`; the description is `sub.description`, how a delegate works, and, when `sub.tools` is a list, "Its tools: …". |
| `delegateToolName(id)` | `(string) => string` | `"delegate_to_<id>"`. |
| `isDelegateTool(name)` | `(string) => boolean` | True for a `delegate_to_<id>` tool name. |
| `DELEGATE_PREFIX` | `"delegate_to_"` | The prefix of a delegate tool's name. |
| `AGENT_ID` | `RegExp` | What an `id` must match: `/^[a-zA-Z0-9_.-]{1,64}$/`. |

## Notes

- Sub-agent entries are checked structurally, not with `instanceof`: in development this module can resolve from source and from `dist` at once, so two copies may coexist.
- A sub-agent's run is bounded by its own `maxSteps`, not by the page tool timeout: a delegate call is not a page tool. It sees only the task (and `context`) the parent gave it, never the rest of the conversation.
- `invoke` is browser only. It loads the browser loop with a dynamic `import()` on its first call, so the agent stays plain data a server can import; on the server it rejects (register the agent with `createChatHandler({ agents })` there).
- `invoke` rejects when the run fails (an `Error` with the adapter's message and `code`), when the signal aborts, and for an empty message. To get live status from a component, use [`useWebAgent`](./use-web-agent.md), which never rejects.
- Listing tool objects makes the file that defines the agent import the module that defines the tools, and the server imports that file too (`api/chat.ts`). Keep catalog tools free of browser-only code at import time, and import `defineWebTool` from `@webmcp-agents/core`, not a React package, in such a module.
- The delegate tool is a client-executed tool like any page tool, so the server still runs one model step per request.

## See also

- [Define an agent](../../build/define-an-agent.mdx), the page that teaches it
- [Call an agent](../../build/call-an-agent.mdx), `agent.invoke` and `useWebAgent`
- [`useWebAgent`](./use-web-agent.md), the React form of `invoke`
- [`createChatHandler`](./create-chat-handler.md), where the server registers `agents`
- [`toToolLoopAgent`](./to-tool-loop-agent.md), the AI SDK agent the server builds from a `WebAgent`
- [`<AgentChat>`](./agent-chat.md) and [`useAgentSession`](./use-agent-session.md)
