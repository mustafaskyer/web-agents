/**
 * Ambient types for the (preview) WebMCP surface this demo relies on.
 *
 * Shapes follow what Chrome ships today plus what the dev polyfill adds.
 * Anything that differs between the two is marked optional.
 */
export {};

declare global {
  type JSONSchema = { [key: string]: unknown };

  /** A tool as returned by `getTools()`. Chrome serialises `inputSchema` to a JSON string. */
  interface ModelContextToolInfo {
    name: string;
    description?: string;
    inputSchema?: JSONSchema | string;
    annotations?: Record<string, unknown>;
  }

  interface ModelContextExecuteOptions {
    signal: AbortSignal;
  }

  /** A tool as passed to `registerTool()`. */
  interface ModelContextTool<Args = Record<string, unknown>> {
    name: string;
    description?: string;
    inputSchema?: JSONSchema;
    annotations?: Record<string, unknown>;
    execute(args: Args, options: ModelContextExecuteOptions): unknown;
  }

  interface ModelContextToolResult {
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    isError?: boolean;
  }

  /** `toolactivated` / `toolcancel` carry the name of the tool they concern. */
  interface ToolEvent extends Event {
    readonly toolName: string;
  }

  interface ModelContextEventMap {
    toolchange: Event;
    toolactivated: ToolEvent;
    toolcancel: ToolEvent;
  }

  interface ModelContext extends EventTarget {
    // biome-ignore lint/suspicious/noExplicitAny: a tool may declare any argument type; registration must accept them all
    registerTool(tool: ModelContextTool<any>, options?: { signal?: AbortSignal }): void;
    unregisterTool?(name: string): void;
    getTools(): Promise<ModelContextToolInfo[]>;
    /**
     * Chrome: `executeTool(toolFromGetTools, args)`. Args are an object in Chrome 156
     * and a JSON string in Chrome 150; the result may be a JSON string.
     * Dev polyfill: `executeTool(name, argsObject)` resolving to a result object.
     */
    executeTool(tool: ModelContextToolInfo | string, args?: Record<string, unknown> | string): Promise<ModelContextToolResult | string>;
    /** Non-standard: only the dev polyfill implements it. */
    cancelTool?(name: string): boolean;

    ontoolchange?: ((ev: Event) => void) | null;
    /** Present from Chrome 156; earlier builds dispatch lifecycle events on `window`. */
    ontoolactivated?: ((ev: ToolEvent) => void) | null;
    ontoolcancel?: ((ev: ToolEvent) => void) | null;

    addEventListener<K extends keyof ModelContextEventMap>(
      type: K,
      listener: (ev: ModelContextEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  }

  interface Document {
    readonly modelContext?: ModelContext;
  }

  /** Pre-156 Chrome dispatches lifecycle events on window. */
  interface WindowEventMap {
    toolactivated: ToolEvent;
    toolcancel: ToolEvent;
  }

  /** Declarative tools: an agent-driven submit can answer the agent. */
  interface SubmitEvent {
    readonly agentInvoked?: boolean;
    respondWith?(result: Promise<unknown>): void;
  }
}
