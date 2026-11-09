# `defineWebAgent`

One agent definition, shared by the browser and the server: what the assistant knows about the site, which of the
page's tools it may use, its sub-agents, its model. Plain frozen data (no DOM, no React, no AI SDK), so the same file is
imported by the React tree, `vite.config.ts` and `api/chat.ts`.

```ts
import {
  AGENT_ID,
  DELEGATE_PREFIX,
  defineWebAgent,
  delegateTool,
  delegateToolName,
  flattenWebAgents,
  isDelegateTool,
  selectTools,
} from "@webmcp-agents/chat/agent";
import type { WebAgent, WebAgentConfig } from "@webmcp-agents/chat/agent";
```

Also re-exported from `@webmcp-agents/chat` and `@webmcp-agents/chat/server`.

## Signature

```ts
function defineWebAgent(config: WebAgentConfig): WebAgent;

interface WebAgentConfig {
  id: string;
  description?: string;
  instructions: string | readonly string[];
  tools?: readonly string[] | ((tools: ToolDescriptor[]) => ToolDescriptor[]);
  agents?: readonly WebAgent[];
  model?: string;
  maxSteps?: number;
}

interface WebAgent extends Readonly<Omit<WebAgentConfig, "instructions" | "agents">> {
  readonly instructions: readonly string[];
  readonly agents: readonly WebAgent[];
}

function flattenWebAgents(agents: readonly WebAgent[]): Map<string, WebAgent>;
function selectTools(agent: WebAgent | undefined, tools: readonly ToolDescriptor[]): ToolDescriptor[];
function delegateTool(sub: WebAgent): ToolDescriptor;
const delegateToolName: (agentId: string) => string;   // "delegate_to_<id>"
const isDelegateTool: (toolName: string) => boolean;
const DELEGATE_PREFIX = "delegate_to_";
const AGENT_ID = /^[a-zA-Z0-9_.-]{1,64}$/;
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | 1–64 of `a-z A-Z 0-9 _ . -`. The browser sends it with each request; the server looks the agent up by it. |
| `description` | `string` | `"Hand a task to the <id> agent."` | For a sub-agent: what it does, in one sentence. It becomes the parent's `delegate_to_<id>` tool description. |
| `instructions` | `string \| readonly string[]` | — | What the site is and how its tools fit together. Trimmed, empty lines dropped; at least one line required. Added to the system prompt under "About this site". |
| `tools` | `readonly string[] \| (tools) => tools` | every page tool | A list of tool ids (page order kept, unknown ids ignored) or a function over the page's current descriptors. Applied in the browser and on the server. |
| `agents` | `readonly WebAgent[]` | `[]` | Sub-agents, each from `defineWebAgent`. One `delegate_to_<id>` tool per sub-agent is added to this agent's tools. |
| `model` | `string` | the handler's model | A `"<provider>/<model>"` id resolved on the server (see [`resolveModel`](./resolve-model.md)). Never a key. |
| `maxSteps` | `number` | the adapter's / handler's | Model steps per user message for this agent; a positive integer. |

## Returns

A frozen `WebAgent`: `instructions` as lines, `agents` as an array (empty by default), the rest as given.

Throws a `TypeError` that names the fix for: a bad `id`, empty `instructions`, a non-positive or fractional `maxSteps`,
`tools` that is neither a list nor a function, an `agents` entry that did not come from `defineWebAgent`, or an id used
twice anywhere in the tree (checked at definition time, not per request).

## Helpers

- **`flattenWebAgents(agents)`**: every agent and sub-agent by id. Throws on a duplicate. The handler builds its
  registry with it.
- **`selectTools(agent, tools)`**: what the model sees. Drops incoming `delegate_to_*` descriptors (the server rebuilds
  them from its registry), applies `agent.tools`, appends one `delegateTool(sub)` per sub-agent (a delegate wins a
  name clash). Without an agent: the page's tools as they are.
- **`delegateTool(sub)`**: the descriptor a parent sees for `sub`. Input schema `{ task: string (required), context?:
  string }`; description = `sub.description`, how it works ("works this page with its own tools and answers with what
  it did and found"), and, with a `tools` list, "Its tools: …".

## Example

```ts
// src/agents.ts (apps/ecommerce)
import { defineWebAgent } from "@webmcp-agents/chat/agent";

export const checkout = defineWebAgent({
  id: "checkout",
  description:
    "Finishes a purchase: reviews the cart, applies a promo code if the user gave one, and places the order (the user confirms on the page).",
  instructions: [
    "You finish purchases at Field Store. Start with get_cart.",
    "Apply a promo code only when the user gave one.",
  ],
  tools: ["get_cart", "open_cart", "close_cart", "go_to_page", "apply_promo", "checkout"],
  maxSteps: 5,
});

export const shopper = defineWebAgent({
  id: "shopper",
  instructions: STORE_INSTRUCTIONS,
  tools: (tools) => tools.filter((t) => t.name !== "checkout" && t.name !== "apply_promo"),
  agents: [checkout],
});
```

## Notes

- Sub-agent entries are checked structurally, not with `instanceof`: in development this module resolves from source
  and from `dist` at once (the Vite app and `vite.config.ts`), so two copies may coexist.
- A sub-agent's run is bounded by its `maxSteps`, not by the page tool timeout: a delegate call is not a page tool.
- The delegate tool is a client-executed tool like any page tool, so the server still runs one model step per request.

## See also

- [Define an agent](../../guides/agents.mdx)
- [`toToolLoopAgent`](./to-tool-loop-agent.md): the AI SDK agent the server builds from a `WebAgent`
- [`createChatHandler`](./create-chat-handler.md), [`AgentChat`](./agent-chat.md), [`useAgentSession`](./use-agent-session.md)
