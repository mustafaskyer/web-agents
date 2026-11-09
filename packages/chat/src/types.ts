/**
 * The contract between the chat widget and whatever agent drives it. An
 * adapter owns the model ↔ tool loop and reports what happens as a stream of
 * parts; the widget only renders them. The cloud adapter (this package) and
 * the in-browser adapter (@webmcp-agents/local-agent) both implement it.
 */
import type { JSONSchema, ModelContextToolResult } from "@webmcp-agents/core";

/** A page tool as the model sees it. */
export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/** What a tool call returns: an MCP result, `{ content, isError? }`. */
export type ToolOutput = ModelContextToolResult;

/** Whether an adapter can run right now (the composer explains anything but `ready`). */
export type AdapterStatus =
  | { state: "ready" }
  | { state: "unavailable"; reason: string }
  /** `note`: a caveat for the download card, e.g. "No WebGPU here: a smaller, slower model runs on the CPU." */
  | { state: "needs-download"; bytes?: number; note?: string }
  | { state: "downloading"; progress: number }
  | { state: "loading" }
  | { state: "error"; error: string };

/** Where a tool call is: running, parked on a confirmation the person must click, or finished. */
export type ToolCallState = "running" | "awaiting-confirmation" | "done" | "error" | "cancelled";

/** One piece of a message. */
export type AgentPart =
  | { type: "text"; text: string }
  /**
   * The model's reasoning, kept so the next request can send it back (Claude
   * requires its signed thinking alongside its tool calls). Not rendered.
   */
  | { type: "reasoning"; text: string; providerMetadata?: Record<string, Record<string, unknown>> }
  | {
      type: "tool";
      id: string;
      name: string;
      input: unknown;
      state: ToolCallState;
      output?: ToolOutput;
      error?: string;
      /** While awaiting confirmation: what the person should click. */
      prompt?: string;
    };

/** One turn of the conversation. */
export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  parts: AgentPart[];
}

/** What an adapter reports while it runs, in order. */
export type AgentStreamPart =
  | { type: "message-start"; messageId: string }
  | { type: "text-delta"; messageId: string; delta: string }
  | { type: "reasoning"; messageId: string; text: string; providerMetadata?: Record<string, Record<string, unknown>> }
  | { type: "tool-call"; messageId: string; id: string; name: string; input: unknown }
  | { type: "tool-result"; id: string; output: ToolOutput }
  | { type: "tool-error"; id: string; error: string }
  | { type: "step-finish"; step: number }
  | { type: "finish"; reason: "stop" | "max-steps" | "aborted" }
  | { type: "error"; error: string; code?: "chat_disabled" | "rate_limited" | "bad_request" | "network" };

/** What an adapter gets for one run (one user message, possibly many model steps). */
export interface AgentRunRequest {
  /** The conversation so far, ending with the new user message. */
  messages: AgentMessage[];
  /**
   * The page's tools right now. A getter: tools change as the page changes (a
   * form hides itself, a route swaps), so read it fresh before every model call.
   */
  readonly tools: ToolDescriptor[];
  /** Aborts when the person presses Stop. */
  signal: AbortSignal;
  /** Run a tool on the page (cursor and all). Never rejects: failures come back as `isError` results. */
  callTool(call: { id: string; name: string; input: unknown }): Promise<ToolOutput>;
}

/** An agent the chat can talk to: the model ↔ tool loop behind a stream of parts. */
export interface AgentAdapter {
  readonly id: string;
  /** Shown in the adapter switcher, e.g. "Claude (cloud)". */
  readonly label: string;
  /** Current availability. Absent means always ready. */
  status?(): AdapterStatus;
  /** Status changes (a download progressing, the cloud check finishing). */
  subscribe?(listener: () => void): () => void;
  /** Opt-in heavy setup, e.g. a model download, started by the person's click. Aborting `signal` cancels it. */
  prepare?(signal?: AbortSignal): Promise<void>;
  run(req: AgentRunRequest): AsyncIterable<AgentStreamPart>;
}
