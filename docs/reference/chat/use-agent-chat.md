# `useAgentChat`

The chat as a `useChat`-shaped React hook: the conversation as AI SDK `UIMessage`s, the adapter choice and its memory,
the adapter's status and models, the suggestions. `<AgentChat>` is built on it; use it to render the chat with your own
components (shadcn/ui's AI patterns, or anything that reads `UIMessage` parts).

```ts
import { useAgentChat } from "@webmcp-agents/chat";
import type { AgentChatState, ToolPhase, UseAgentChatOptions } from "@webmcp-agents/chat";
```

## Signature

```ts
function useAgentChat(options: UseAgentChatOptions): AgentChatState;

interface UseAgentChatOptions {
  adapter?: AgentAdapter;
  adapters?: readonly AgentAdapter[];
  agent?: WebAgent;
  storageKey?: string | false;
}

interface AgentChatState {
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error?: SessionError;
  sendMessage(input: { text: string }): void;
  stop(): void;
  regenerate(): void;
  clear(): void;
  tools: ToolDescriptor[];
  suggestions: string[];
  adapters: readonly AgentAdapter[];
  adapter: AgentAdapter;
  selectAdapter(id: string): void;
  adapterStatus: AdapterStatus;
  models: readonly ModelChoice[];
  selectModel?(id: string): Promise<void>;
  prepare?(signal?: AbortSignal): Promise<void>;
  agent?: WebAgent;
  toolPhase(part: UIMessage["parts"][number]): ToolPhase | undefined;
  session: AgentSession;
}

interface ToolPhase {
  phase: "running" | "parked" | "done" | "error" | "cancelled";
  prompt?: string;
  agent?: { id: string; messages: UIMessage[] };
}
```

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `adapter` / `adapters` | `AgentAdapter` / `readonly AgentAdapter[]` | — | One is required. With several, the person's choice is remembered in localStorage (`web-agents:chat:adapter`); the first is the default. |
| `agent` | `WebAgent` | — | The page's agent ([`defineWebAgent`](./define-web-agent.md)). |
| `storageKey` | `string \| false` | `"web-agents:chat"` | sessionStorage key for the conversation; `false` keeps it in memory. |

## Returns

| Field | Description |
|---|---|
| `messages` | AI SDK `UIMessage`s for rendering: `text` and `reasoning` parts carry `state` (`streaming` on the last part while the run streams), tool calls are `dynamic-tool` parts with `input-available` (running or parked), `output-available` or `output-error` (`errorText`; a cancelled call carries `Error [cancelled]: …`). Messages left empty are kept. |
| `status` | AI SDK `ChatStatus` names: `submitted` until the reply's first part, then `streaming`, then `ready`; `error` after a failed run. |
| `sendMessage({ text })` / `stop()` / `regenerate()` / `clear()` | Send, stop, resume the interrupted turn from its last finished tool call, start over. |
| `tools`, `suggestions` | What the model sees (through the agent's filter), and starter prompts from the tools. |
| `adapters`, `adapter`, `selectAdapter(id)`, `adapterStatus` | The switcher's data. |
| `models`, `selectModel(id)`, `prepare(signal)` | The current adapter's models and opt-in setup (a model download), when it has them. |
| `toolPhase(part)` | For a tool part: `parked` (waiting for the person's click on the page, with the `prompt` to show), `running`, `done`, `error`, `cancelled`; and for a `delegate_to_<id>` call, `agent` with the sub-agent's nested run as `UIMessage`s. `undefined` for non-tool parts. |
| `session` | The underlying [`AgentSession`](./use-agent-session.md), for UIs that render the chat's own message shape. |

## Example

```tsx
const chat = useAgentChat({ adapters, agent: shopper });

{chat.messages.map((m) =>
  m.parts.map((part) => {
    if (part.type === "text") return <Streamdown>{part.text}</Streamdown>;
    if (part.type !== "dynamic-tool") return null;
    const phase = chat.toolPhase(part);
    if (phase?.phase === "parked") return <Item>Confirm on the page: {phase.prompt}</Item>;
    return <Tool part={part} />;
  }),
)}
```

See the `agent-chat` block of the `@webmcp-agents` registry for a complete chat ([Use your shadcn components](../../guides/ai-elements.mdx)).

## Notes

- The `UIMessage` shape is canonical: nothing web-agents-specific is added to parts. `toolPhase` is the one extra.
- Reasoning parts keep their `providerMetadata` (signed thinking); the hook renders what the session has, it never
  mutates it.
- `<AgentChat>` uses this hook internally, so a custom UI and the built-in widget agree on every state.

## See also

- [`useAgentSession`](./use-agent-session.md)
- [`AgentChat`](./agent-chat.md)
- [Adapter types](./adapter-types.md)
