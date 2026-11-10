---
description: "TypeScript types for the preview WebMCP surface (document.modelContext): what Chrome ships plus what the polyfill adds."
---

# WebMCP types

TypeScript types for the preview WebMCP surface (`document.modelContext`): what Chrome ships plus what the polyfill adds. Reach for them when you read tools, call `registerTool` yourself or listen to the lifecycle events. Anything that differs between Chrome and the polyfill is optional.

## Import

```ts
import type {
  JSONSchema,
  ModelContext,
  ModelContextExecuteOptions,
  ModelContextTool,
  ModelContextToolInfo,
  ModelContextToolResult,
  ToolEvent,
} from "@webmcp-agents/core";
```

The types are declared as globals and re-exported by name, so other packages can import them explicitly, which also pulls the global declarations into their emitted `.d.ts`.

## Example

Read a result's text, list the page's tools and listen for calls.

<include meta='title="webmcp.ts"'>/_examples/shared/reference/core/webmcp-types.ts</include>

## Options

Each type's members. Optional members (`?`) differ between Chrome and the polyfill or between Chrome versions.

### `JSONSchema`

`type JSONSchema = { [key: string]: unknown }`: a JSON Schema object, as WebMCP carries tool parameters.

### `ModelContext`

What `document.modelContext` is: an `EventTarget` with these members.

| Name | Type | Default | Description |
|---|---|---|---|
| `registerTool` | `(tool: ModelContextTool, options?: { signal?: AbortSignal }) => void` | required | Make a tool callable by agents. Aborting `options.signal` unregisters it. Prefer [`registerWebTool`](./register-web-tool.md), which adds validation, confirmation and result handling. |
| `unregisterTool` | `(name: string) => void` | optional | Remove a tool by name, when the browser has it. |
| `getTools` | `() => Promise<ModelContextToolInfo[]>` | required | The tools registered right now. Chrome serialises each `inputSchema` to a JSON string. |
| `executeTool` | `(tool: ModelContextToolInfo \| string, args?: Record<string, unknown> \| string, options?: { signal?: AbortSignal }) => Promise<ModelContextToolResult \| string>` | required | Call a tool. Chrome: `executeTool(toolFromGetTools, args)`, with args an object in Chrome 156 and a JSON string in Chrome 150, and a result that may be a JSON string. Polyfill: `executeTool(name, argsObject)` resolving to a result object. Aborting `options.signal` cancels the pending call. From library UI use [`executeTool`](./execute-tool.md), which hides the difference. |
| `cancelTool` | `(name: string) => boolean` | optional | Non-standard, polyfill only: cancel a call someone else started (the devtools). Use `executeTool`'s `signal` for your own. |
| `ontoolchange` | `((ev: Event) => void) \| null` | optional | Handler for `toolchange`: the set of tools changed. |
| `ontoolactivated` | `((ev: ToolEvent) => void) \| null` | optional | Handler for `toolactivated`: a tool run started. Present from Chrome 156; earlier builds dispatch the event on `window`. |
| `ontoolcancel` | `((ev: ToolEvent) => void) \| null` | optional | Handler for `toolcancel`. Present from Chrome 156; earlier builds dispatch the event on `window`. |
| `addEventListener` | typed for `"toolchange"`, `"toolactivated"`, `"toolcancel"` | required | Listen to the three events with their event types. |

### `ModelContextTool<Args>`

A tool as passed to `registerTool`. `Args` defaults to `Record<string, unknown>`.

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | The tool's name, which agents call it by. |
| `title` | `string` | optional | A human name (Chrome 156 and later). |
| `description` | `string` | optional | What the tool does and when to use it: the agent decides from this text. |
| `inputSchema` | `JSONSchema` | optional | The parameters, as a JSON Schema object. |
| `annotations` | `Record<string, unknown>` | optional | Hints such as `readOnlyHint` and `destructiveHint`. |
| `execute` | `(args: Args, options: ModelContextExecuteOptions) => unknown` | required | Runs the call. Its return value is the agent's answer. |

### `ModelContextToolInfo`

A tool as returned by `getTools()`.

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | The tool's name. |
| `title` | `string` | optional | A human name, when the browser has one. |
| `description` | `string` | optional | The tool's description. |
| `inputSchema` | `JSONSchema \| string` | optional | The parameters. Native Chrome returns a JSON string; the polyfill an object. |
| `annotations` | `Record<string, unknown>` | optional | The tool's hints. |

### `ModelContextExecuteOptions`

| Name | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | required | Aborts when the call is cancelled. Pass it to your fetches. |

### `ModelContextToolResult`

What a call answers with.

| Name | Type | Default | Description |
|---|---|---|---|
| `content` | `Array<{ type: string; text?: string; [key: string]: unknown }>` | required | The answer, as MCP content parts; text parts have `type: "text"` and a `text`. |
| `isError` | `boolean` | optional | True for a failed call. |
| `structuredContent` | `Record<string, unknown>` | optional | MCP structured output. A failed call may carry `{ error: { code, retryable } }`; see [`toolError`](./tool-error.md). |

### `ToolEvent`

Dispatched as `toolactivated` and `toolcancel`; extends `Event`.

| Name | Type | Default | Description |
|---|---|---|---|
| `toolName` | `string` | required | The name of the tool the event concerns. |

### Global augmentations

Importing `@webmcp-agents/core` (even for types) also declares:

| Global | Addition |
|---|---|
| `Document` | `readonly modelContext?: ModelContext` |
| `WindowEventMap` | `toolactivated: ToolEvent`, `toolcancel: ToolEvent` (Chrome before 156 dispatches them on `window`) |
| `ModelContextEventMap` | `toolchange: Event`, `toolactivated: ToolEvent`, `toolcancel: ToolEvent` |
| `SubmitEvent` | `readonly agentInvoked?: boolean` and `respondWith?(result: Promise<unknown>): void`, for declarative tools: an agent-driven submit can answer the agent |

## Notes

- WebMCP is an origin-trial API whose shapes move: it went from `navigator.modelContext` to `document.modelContext`, and its events moved from `window` to `document.modelContext` in Chrome 156.
- Native `getTools()` returns `inputSchema` as a string; parse it before reading properties.
- Use [`executeTool`](./execute-tool.md) instead of `document.modelContext.executeTool` from library UI: the argument and result shapes differ by Chrome version.
- Only `@webmcp-agents/core` (which holds the polyfill), the devtools and the chat touch `document.modelContext`; keep feature detection ([`isWebMCPAvailable`](./is-webmcp-available.md)) there.

## See also

- [How it works](../../concepts/how-it-works.mdx), where WebMCP sits
- [`executeTool`](./execute-tool.md), calling tools across Chrome builds
- [`toModelContextTool`](./to-model-context-tool.md), a `WebTool` as a `ModelContextTool`
- [`isWebMCPAvailable`](./is-webmcp-available.md), feature detection
