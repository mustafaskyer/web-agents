---
description: "Runs an agent from a component, with live status and no chat on the page."
---

# `useWebAgent`

Runs an agent from a component, with live status and no chat on the page. It is the React form of [`agent.invoke`](./define-web-agent.md#agentinvoke): the page's tools run under the cursor, a confirm-gated tool waits for the person's click (`status` is `"waiting"`), and sub-agents run nested. Reach for it when a button or a form should hand a task to the agent and show how it is going.

## Import

```ts
import { useWebAgent } from "@webmcp-agents/chat";
import type {
  UseWebAgentOptions,
  WebAgentHandle,
  WebAgentStatus,
} from "@webmcp-agents/chat";
```

## Example

A button that runs the agent and lists each step it takes, including a call parked on the person's click.

<include meta='title="components/reorder.tsx"'>/_examples/shared/reference/chat/use-web-agent.tsx</include>

## Options

`useWebAgent(agent, options?)`. The first argument is the agent; the second holds the hook's own options.

| Name | Type | Default | Description |
|---|---|---|---|
| `agent` | `WebAgent` | required | The agent, from [`defineWebAgent`](./define-web-agent.md). The latest render's value is used, so `invoke` stays one function. |
| `adapter` | `AgentAdapter` | one shared `createCloudAdapter()` | What runs the model: the same default as [`<AgentChat>`](./agent-chat.md) and `agent.invoke`, your `/api/chat`. Create a custom adapter once, at module scope. Passed in the second argument: `useWebAgent(agent, { adapter })`. |

## Returns

A `WebAgentHandle`:

| Name | Type | Description |
|---|---|---|
| `invoke(text)` | `(text: string) => Promise<WebAgentResult \| undefined>` | Run the agent on one message: a fresh conversation each time, and a run in flight is stopped first. Resolves with the result (`text`, `steps`, `messages`), or `undefined` when the run was stopped or failed. It never rejects, so `onClick={() => agent.invoke("…")}` needs no `catch`; a failure is in `error`. An empty message does nothing. |
| `stop()` | `() => void` | Stop the run in flight: the model, the tool running and any sub-agent. `status` goes back to `idle` and the open steps show as `cancelled`. |
| `status` | `WebAgentStatus` | `"idle"` (none yet, finished or stopped), `"running"`, `"waiting"` (a tool is parked on the page until the person clicks; see the steps' `prompt`) or `"error"` (the last run failed). |
| `steps` | `WebAgentStep[]` | The tool calls of the current or last run, live, a sub-agent's included (with `agent` set). See [`WebAgentStep`](./define-web-agent.md#agentinvoke-result). |
| `text` | `string` | The agent's answer so far, streamed. |
| `error` | `SessionError` | Why the last run failed: `{ message, code? }`, with a code the adapter gave (offline, rate limited…). Cleared by the next `invoke`. |

## Notes

- It aborts the run in flight when the component unmounts.
- The page's tools are read again after each tool call, once they have settled, so a navigation's new tools are there for the next step.
- It needs the page's tools to be registered, so render it under [`<WebAgentsProvider>`](../react/web-agents-provider.md). The agent's `tools` list picks from them.
- To render a full conversation instead, use [`useAgentChat`](./use-agent-chat.md) or [`<AgentChat>`](./agent-chat.md).

## See also

- [Call an agent](../../build/call-an-agent.mdx), the page that teaches it
- [`defineWebAgent`](./define-web-agent.md) (`agent.invoke`, `WebAgentStep`, `WebAgentResult`)
- [`useAgentChat`](./use-agent-chat.md)
- [Adapter types](./adapter-types.md)
