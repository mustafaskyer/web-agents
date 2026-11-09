# `useAgentSession`

A React hook for a conversation with an agent about the current page. It is what `<AgentChat>` renders; use it to build
your own chat UI on the same session logic.

```ts
import { useAgentSession } from "@webmcp-agents/chat";
```

## Signature

```ts
function useAgentSession(adapter: AgentAdapter, options?: UseAgentSessionOptions): AgentSession;

interface UseAgentSessionOptions {
  storageKey?: string | false;
  agent?: WebAgent;
}

interface AgentSession {
  messages: AgentMessage[];
  status: "idle" | "streaming" | "error";
  error?: SessionError;
  tools: ToolDescriptor[];
  adapterStatus: AdapterStatus;
  agent?: WebAgent;
  send(text: string): void;
  stop(): void;
  retry(): void;
  reset(): void;
}
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `adapter` | `AgentAdapter` | — | The agent that runs the model loop. |
| `options.storageKey` | `string \| false` | `"web-agents:chat"` | sessionStorage key for the conversation. `false` keeps it in memory only. |
| `options.agent` | `WebAgent` | — | The page's agent ([`defineWebAgent`](./define-web-agent.md)). `tools` is filtered through it (plus one `delegate_to_<id>` tool per sub-agent), the request carries it, and a `delegate_to_*` call runs the sub-agent's own loop on the same adapter, nested under the call (`AgentPart.agent`). |

## Returns

| Field | Type | Description |
|---|---|---|
| `messages` | `AgentMessage[]` | The conversation. |
| `status` | `"idle" \| "streaming" \| "error"` | Whether a run is streaming, or the last one failed. |
| `error` | `SessionError \| undefined` | The last run's failure (`message`, optional `code`). |
| `tools` | `ToolDescriptor[]` | What the model sees right now: the page's tools through the agent's filter, plus its delegate tools. |
| `agent` | `WebAgent \| undefined` | The agent in use. |
| `adapterStatus` | `AdapterStatus` | The adapter's status, updated through its `subscribe()`. Absent `status()` means `ready`. |
| `send(text)` | `(text: string) => void` | Trims `text` and starts a run. Ignored when empty or while streaming. |
| `stop()` | `() => void` | Aborts the run; open tool calls become `cancelled`. |
| `retry()` | `() => void` | Resumes the interrupted turn from its last finished tool call. Ignored while streaming or with no user message. |
| `reset()` | `() => void` | Stops and starts a new conversation. |

## What a run does

1. Waits for the page's tools to settle (no `toolchange` for 100 ms, at most 1.5 s), then reads them.
2. Calls `adapter.run()` with the messages, a `tools` getter that always returns the latest list, an `AbortSignal`,
   and a `callTool` that runs [`callModelContextTool`](./call-model-context-tool.md) with that signal.
3. After each tool call, waits for the tools to settle again (150 ms quiet, at most 1.5 s) and refreshes them, since
   the call may have navigated or opened a form.
4. Feeds every stream part to [`sessionReducer`](./session-reducer.md). Core `park` and `start` agent events mark the
   open call of that tool as `awaiting-confirmation` or `running`.

## Example

```tsx
import { createCloudAdapter, useAgentSession } from "@webmcp-agents/chat";

const cloud = createCloudAdapter();

function MiniChat() {
  const chat = useAgentSession(cloud, { storageKey: false });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        chat.send(new FormData(e.currentTarget).get("q") as string);
      }}
    >
      {chat.messages.map((m) => (
        <p key={m.id}>{m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}</p>
      ))}
      {chat.status === "error" && <button type="button" onClick={chat.retry}>Try again</button>}
      <input name="q" disabled={chat.adapterStatus.state !== "ready"} />
    </form>
  );
}
```

## Notes

- **Retry resumes.** It sends [`resumable(messages)`](./session-reducer.md#resumable): the conversation through the
  last tool call that finished, so nothing is done twice (no second add to cart). With nothing finished, the turn
  starts over from the user's message. The TSDoc on `retry` says "Run again from the last user message"; the code
  resumes as described here.
- Only the last 60 messages are stored. Loading from storage marks any call that was running as `cancelled`.
- A new `send` or `retry` aborts a previous run; parts from a superseded run are dropped.
- An adapter that throws becomes an `error` part with the thrown message.
- Unmounting aborts the run.
- Render it under `<WebAgentsProvider>` (or any page with `document.modelContext`); without WebMCP `tools` is empty.

## See also

- [`sessionReducer` and `resumable`](./session-reducer.md)
- [`callModelContextTool`](./call-model-context-tool.md)
- [`listToolDescriptors`](./list-tool-descriptors.md)
- [`AgentChat`](./agent-chat.md)
