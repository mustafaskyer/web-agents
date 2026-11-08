# WebMCP types

TypeScript types for the preview WebMCP surface (`document.modelContext`), covering what Chrome ships plus what the dev polyfill adds. Anything that differs between the two is optional. They are declared as globals and re-exported by name, so other packages can import them explicitly, which also pulls the global declarations into their emitted `.d.ts`.

```ts
import type {
  JSONSchema,
  ModelContext,
  ModelContextExecuteOptions,
  ModelContextTool,
  ModelContextToolInfo,
  ModelContextToolResult,
  ToolEvent,
} from "@web-agents/core";
```

## Signature

```ts
type JSONSchema = { [key: string]: unknown };

/** A tool as returned by getTools(). Chrome serialises inputSchema to a JSON string. */
interface ModelContextToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: JSONSchema | string;
  annotations?: Record<string, unknown>;
}

interface ModelContextExecuteOptions {
  signal: AbortSignal;
}

/** A tool as passed to registerTool(). */
interface ModelContextTool<Args = Record<string, unknown>> {
  name: string;
  title?: string; // Chrome ≥156
  description?: string;
  inputSchema?: JSONSchema;
  annotations?: Record<string, unknown>;
  execute(args: Args, options: ModelContextExecuteOptions): unknown;
}

interface ModelContextToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

/** toolactivated / toolcancel carry the name of the tool they concern. */
interface ToolEvent extends Event {
  readonly toolName: string;
}

interface ModelContext extends EventTarget {
  registerTool(tool: ModelContextTool<any>, options?: { signal?: AbortSignal }): void;
  unregisterTool?(name: string): void;
  getTools(): Promise<ModelContextToolInfo[]>;
  executeTool(
    tool: ModelContextToolInfo | string,
    args?: Record<string, unknown> | string,
    options?: { signal?: AbortSignal },
  ): Promise<ModelContextToolResult | string>;
  cancelTool?(name: string): boolean;
  ontoolchange?: ((ev: Event) => void) | null;
  ontoolactivated?: ((ev: ToolEvent) => void) | null;
  ontoolcancel?: ((ev: ToolEvent) => void) | null;
  // typed addEventListener for "toolchange" | "toolactivated" | "toolcancel"
}
```

## Global augmentations

Importing `@web-agents/core` (even for types) also declares:

| Global | Addition |
|---|---|
| `Document` | `readonly modelContext?: ModelContext` |
| `WindowEventMap` | `toolactivated: ToolEvent`, `toolcancel: ToolEvent` (pre-156 Chrome dispatches them on `window`) |
| `SubmitEvent` | `readonly agentInvoked?: boolean`, `respondWith?(result: Promise<unknown>): void` (declarative tools: an agent-driven submit can answer the agent) |
| `ModelContextEventMap` | `toolchange: Event`, `toolactivated: ToolEvent`, `toolcancel: ToolEvent` |

## Fields worth knowing

| Member | Description |
|---|---|
| `ModelContextToolResult.structuredContent` | MCP structured output. A failed call may carry `{ error: { code, retryable } }` (see [`toolError`](./tool-error.md)). |
| `ModelContext.executeTool` | Chrome: `executeTool(toolFromGetTools, args)`, args an object in Chrome 156 and a JSON string in Chrome 150; the result may be a JSON string. Polyfill: `executeTool(name, argsObject)` resolving to a result object. Aborting `options.signal` cancels the pending call. |
| `ModelContext.cancelTool` | Non-standard, dev polyfill only: cancel a call someone else started (devtools). Use `executeTool`'s `signal` for your own. |
| `ModelContext.ontoolactivated` / `ontoolcancel` | Present from Chrome 156; earlier builds dispatch lifecycle events on `window`. |

## Example

```ts
import type { ModelContextToolResult } from "@web-agents/core";

const textOf = (res: ModelContextToolResult): string => res.content.find((c) => c.type === "text")?.text ?? "";

document.modelContext?.addEventListener("toolactivated", (e) => console.debug("agent called", e.toolName));
```

## Notes

- WebMCP is an origin-trial API whose shapes move: it moved from `navigator.modelContext` to `document.modelContext`, and event targets moved from `window` to `document.modelContext` in Chrome 156.
- Native `getTools()` returns `inputSchema` as a string.
- Use [`executeTool`](./execute-tool.md) instead of `document.modelContext.executeTool` from library UI.

## See also

- [`executeTool`](./execute-tool.md)
- [`toModelContextTool`](./to-model-context-tool.md)
- [`isWebMCPAvailable`](./is-webmcp-available.md)
