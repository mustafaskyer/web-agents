# Adapter types

The contract between the chat widget and the agent that drives it. An adapter owns the model and tool loop and reports
what happens as a stream of parts; the widget only renders them. `createCloudAdapter` and `createLocalAdapter` both
implement it.

```ts
import type {
  AdapterStatus, AgentAdapter, AgentMessage, AgentPart, AgentRunRequest,
  AgentStreamPart, ToolCallState, ToolDescriptor, ToolOutput,
} from "@webmcp-agents/chat";
```

## `AgentAdapter`

```ts
interface AgentAdapter {
  readonly id: string;
  readonly label: string;
  status?(): AdapterStatus;
  subscribe?(listener: () => void): () => void;
  prepare?(signal?: AbortSignal): Promise<void>;
  models?(): readonly ModelChoice[];
  selectModel?(id: string): Promise<void>;
  run(req: AgentRunRequest): AsyncIterable<AgentStreamPart>;
}

interface ModelChoice {
  id: string;
  label: string;
  brief: string;
  bytes?: number;
  cached?: boolean;
  recommended?: boolean;
  selected?: boolean;
}
```

| Member | Description |
|---|---|
| `id` | Stable id; the widget remembers the chosen adapter by it. |
| `label` | Shown in the adapter switcher, e.g. "Claude (cloud)". |
| `status()` | Current availability. Absent means always ready. |
| `subscribe(listener)` | Called on status changes (a download progressing, the cloud check finishing). Returns an unsubscribe function. |
| `prepare(signal)` | Opt-in heavy setup, e.g. a model download, started by the person's click. Aborting `signal` cancels it. |
| `models()` | The models the person can pick from. The widget shows a picker (label, brief, size, "on this device") when there is more than one. `ModelChoice.selected` marks the one in use, `recommended` the default. |
| `selectModel(id)` | Switch to one of `models()`; the status then describes what the new model needs (`needs-download` with its size, or `ready`). Rejects with `Error [busy]` while a reply or a download is in progress. |
| `run(req)` | One user message: yields stream parts and calls `req.callTool()` for each tool call. |

## `AdapterStatus`

```ts
type AdapterStatus =
  | { state: "ready" }
  | { state: "unavailable"; reason: string }
  | { state: "needs-download"; bytes?: number; note?: string }
  | { state: "downloading"; progress: number }
  | { state: "loading"; progress?: number }
  | { state: "error"; error: string };
```

The composer explains any state but `ready`. `note` is a caveat for the download card, e.g. "No WebGPU here: a
smaller, slower model runs on the CPU." `progress` is 0 to 1. `loading` without `progress` is a connection check (the
cloud adapter); with `progress` it is a model already on this device being read from disk, which the widget shows as
"Loading the model from this device…", never as a download.

## `AgentRunRequest`

```ts
interface AgentRunRequest {
  messages: AgentMessage[];
  readonly tools: ToolDescriptor[];
  signal: AbortSignal;
  callTool(call: { id: string; name: string; input: unknown }): Promise<ToolOutput>;
  agent?: WebAgent;
}
```

| Field | Description |
|---|---|
| `messages` | The conversation so far, ending with the new user message (or, on Retry, with the last finished tool call). |
| `agent` | The page's agent ([`defineWebAgent`](./define-web-agent.md)), when set. `tools` is already filtered through it. Browser adapters read `instructions` and `maxSteps`; the cloud adapter sends only `id`. |
| `tools` | The page's tools right now. A getter: read it fresh before every model call. |
| `signal` | Aborts when the person presses Stop. |
| `callTool(call)` | Runs a tool on the page, cursor and all. Never rejects: failures come back as `isError` results. |

## `AgentStreamPart`

```ts
type ProviderMetadata = Record<string, Record<string, unknown>>;

type AgentStreamPart =
  | { type: "message-start"; messageId: string }
  | { type: "text-delta"; messageId: string; delta: string }
  | { type: "reasoning"; messageId: string; text: string; providerMetadata?: ProviderMetadata }
  | { type: "tool-call"; messageId: string; id: string; name: string; input: unknown; providerMetadata?: ProviderMetadata }
  | { type: "tool-result"; id: string; output: ToolOutput }
  | { type: "tool-error"; id: string; error: string }
  | { type: "step-finish"; step: number }
  | { type: "finish"; reason: "stop" | "max-steps" | "aborted" }
  | { type: "error"; error: string; code?: "chat_disabled" | "rate_limited" | "bad_request" | "network" };
```

What an adapter reports while it runs, in order. Start each assistant message with `message-start`; text, reasoning
and tool calls refer to it by `messageId`. End the run with `finish` or `error`.

## `AgentMessage` and `AgentPart`

```ts
interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  parts: AgentPart[];
}

type AgentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; providerMetadata?: Record<string, Record<string, unknown>> }
  | {
      type: "tool";
      id: string;
      name: string;
      input: unknown;
      state: ToolCallState;
      output?: ToolOutput;
      error?: string;
      prompt?: string;
      agent?: { id: string; messages: AgentMessage[] };
      providerMetadata?: Record<string, Record<string, unknown>>;
    };
```

`reasoning` is the model's reasoning, kept so the next request can send it back (Claude requires its signed thinking
alongside its tool calls). It is not rendered. On a tool part, `prompt` is what the person should click while the call
awaits confirmation; `agent` is a sub-agent's nested run behind a `delegate_to_<id>` call (its id and its own
messages, rendered nested); `providerMetadata` is provider data that must travel with the call (Gemini thought
signatures, OpenAI item ids), sent back like reasoning's.

## `ToolCallState`

```ts
type ToolCallState = "running" | "awaiting-confirmation" | "done" | "error" | "cancelled";
```

## `ToolDescriptor` and `ToolOutput`

```ts
interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

type ToolOutput = ModelContextToolResult; // { content, isError?, structuredContent? } from @webmcp-agents/core
```

## Example

```ts
// a minimal adapter that answers in words and never calls tools
const echo: AgentAdapter = {
  id: "echo",
  label: "Echo",
  async *run(req) {
    const messageId = crypto.randomUUID();
    yield { type: "message-start", messageId };
    yield { type: "text-delta", messageId, delta: `This page has ${req.tools.length} tools.` };
    yield { type: "finish", reason: "stop" };
  },
};
```

## Notes

- Run tool calls one at a time: one page, one cursor. The session matches confirmation events to calls by tool name.
- Yield `tool-result` or `tool-error` for every `tool-call`, with the same `id`.
- A `tool-error` whose text starts with `Error [cancelled]` shows as cancelled, not failed.

## See also

- [`createCloudAdapter`](./create-cloud-adapter.md)
- [`createLocalAdapter`](../local-agent/create-local-adapter.md)
- [`sessionReducer`](./session-reducer.md)
- [`callModelContextTool`](./call-model-context-tool.md)
