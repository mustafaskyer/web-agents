# `sessionReducer`

The chat session as a pure state machine: messages, whether a run is streaming, and the last error. `useAgentSession`
feeds it adapter stream parts and core agent events. `resumable` decides what Retry sends.

```ts
import { resumable, sessionReducer } from "@web-agents/chat";
import type { SessionAction, SessionError, SessionState } from "@web-agents/chat";
```

## Signature

```ts
function sessionReducer(state: SessionState, action: SessionAction): SessionState;
function resumable(messages: AgentMessage[]): AgentMessage[];

interface SessionState {
  messages: AgentMessage[];
  status: "idle" | "streaming" | "error";
  error?: SessionError;
}

interface SessionError {
  message: string;
  code?: "chat_disabled" | "rate_limited" | "bad_request" | "network";
}

type SessionAction =
  | { type: "send"; id: string; text: string }
  | { type: "part"; part: AgentStreamPart }
  | { type: "toolPhase"; name: string; state: "running" | "awaiting-confirmation"; prompt?: string }
  | { type: "stop" }
  | { type: "retry" }
  | { type: "reset" };
```

## Actions

| Action | Effect |
|---|---|
| `send` | Appends a user message with one text part; `status` becomes `streaming`; clears `error`. |
| `part` | Applies one [`AgentStreamPart`](./adapter-types.md#agentstreampart) (see below). |
| `toolPhase` | A core agent event about a running tool. Sets the newest open call of that tool name to `state` and `prompt`. Calls run one at a time, so name matching is enough. |
| `stop` | `status` becomes `idle`; every `running` or `awaiting-confirmation` call becomes `cancelled`. |
| `retry` | No-op without a user message. Otherwise `status` becomes `streaming` and messages become `resumable(messages)`. |
| `reset` | Back to the empty session (`{ messages: [], status: "idle" }`). |

Stream parts:

| Part | Effect |
|---|---|
| `message-start` | Appends an empty assistant message. |
| `text-delta` | Appends to the message's last text part, or adds one. |
| `reasoning` | Adds a reasoning part (kept for the next request, not rendered). |
| `tool-call` | Adds a tool part in state `running`. |
| `tool-result` | That call becomes `done` with its `output`. |
| `tool-error` | That call becomes `cancelled` when [`isCancelled(error)`](./call-model-context-tool.md#cancelled-and-iscancelled), else `error`. |
| `step-finish` | No change. |
| `finish` | `status` becomes `idle`; with `reason: "aborted"`, open calls become `cancelled`. |
| `error` | `status` becomes `error`, `error` is set, open calls become `cancelled`. |

## `resumable`

```ts
function resumable(messages: AgentMessage[]): AgentMessage[];
```

What Retry sends: the conversation through the last tool call that finished (`done` or `error`) after the last user
message. What came after it goes: unfinished calls (they are dropped, not reported to the model as "Cancelled by the
user") and a reply cut short. With no finished call, it returns the messages through the last user message, so the
turn starts over. Without any user message it returns `messages` unchanged.

## Returns

`sessionReducer` returns the next `SessionState` (the same object when nothing changed for `toolPhase`).
`resumable` returns a new message array.

## Example

```ts
import { useReducer } from "react";

const [state, dispatch] = useReducer(sessionReducer, { messages: [], status: "idle" });
dispatch({ type: "send", id: "u-1", text: "Add two mugs to the cart" });
for await (const part of adapter.run(request)) dispatch({ type: "part", part });
```

## Notes

- Pure and DOM-free: safe to test in Node.
- `useAgentSession` applies `stop` to a conversation loaded from sessionStorage, so a reload never shows a call as
  still running.
- The comment on the `retry` action says it "drops what came after" the last user message; the code keeps finished
  tool calls through `resumable`.

## See also

- [`useAgentSession`](./use-agent-session.md)
- [Adapter types](./adapter-types.md)
- [Tool error codes](../core/tool-error.md)
