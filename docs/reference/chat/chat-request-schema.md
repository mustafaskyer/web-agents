# `chatRequestSchema`

The zod schema for the POST body of `/api/chat`, and the caps it enforces. Counts, sizes and names are capped so a
page, or anyone calling the endpoint, can't send an unbounded prompt.

```ts
import { chatRequestSchema, LIMITS } from "@webmcp-agents/chat/server";
import type { ChatRequest } from "@webmcp-agents/chat/server";
```

## Signature

```ts
const chatRequestSchema: z.ZodObject<…>;
type ChatRequest = z.infer<typeof chatRequestSchema>;

const LIMITS: {
  readonly bodyBytes: 1048576;
  readonly messages: 160;
  readonly parts: 40;
  readonly text: 8000;
  readonly reasoning: 32000;
  readonly tools: 48;
  readonly description: 1024;
  readonly schemaBytes: 8192;
};
```

## Shape

```ts
{
  messages: AgentMessage[];                          // 1 to LIMITS.messages
  tools: { name: string; description: string; inputSchema: Record<string, unknown> }[];
  page?: { url?: string };                           // url ≤ 2000 characters
  agent?: string;                                    // the agent's id; looked up in the handler's registry
}
```

| Field | Rule |
|---|---|
| `messages` | 1 to 160. Each: `id` 1–64 characters, `role` `"user"` or `"assistant"`, at most 40 `parts`. |
| text part | `text` ≤ 8000 characters. |
| reasoning part | `text` ≤ 32 000 characters; `providerMetadata` ≤ 32 000 characters as JSON. |
| tool part | `id` 1–128 characters; `name` matches the tool name rule; `state` one of the `ToolCallState`s; `output.content` ≤ 20 items; `error` and `prompt` ≤ 8000 characters; `providerMetadata` ≤ 32 000 characters as JSON. A nested `agent` run is not accepted (the cloud adapter strips it). |
| `tools` | At most 48, unique names. |
| tool `name` | `/^[a-zA-Z0-9_.-]{1,128}$/` |
| tool `description` | ≤ 1024 characters. |
| tool `inputSchema` | An object, ≤ 8192 characters as JSON. |
| `page.url` | Optional, ≤ 2000 characters. Only a same-origin path reaches the model. |
| `agent` | Optional, `/^[a-zA-Z0-9_.-]{1,64}$/`. An id only: instructions in the body are unknown keys and are stripped. |

## `LIMITS`

| Key | Value | Meaning |
|---|---|---|
| `bodyBytes` | 1 048 576 | Request body, counted while streaming. |
| `messages` | 160 | Messages per request. The cloud adapter trims the oldest past this. |
| `parts` | 40 | Parts per message. |
| `text` | 8000 | Characters per text, error or prompt. |
| `reasoning` | 32 000 | Characters of reasoning text (and its metadata). |
| `tools` | 48 | Tools per request. |
| `description` | 1024 | Characters per tool description. |
| `schemaBytes` | 8192 | Characters per input schema, as JSON. |

## Returns

`chatRequestSchema.safeParse(body)` gives `{ success: true, data: ChatRequest }` or the zod issues.

## Example

```ts
const parsed = chatRequestSchema.safeParse(await req.json());
if (!parsed.success) return Response.json({ error: "bad_request", issues: parsed.error.issues.slice(0, 10) }, { status: 400 });
const { messages, tools, page } = parsed.data;
```

## Notes

- `createChatHandler` already applies it; use it when you write your own handler or test a client.
- `LIMITS` is exported from `@webmcp-agents/chat/server`, not the main entry.

## See also

- [`createChatHandler`](./create-chat-handler.md)
- [Adapter types](./adapter-types.md)
