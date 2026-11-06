/**
 * The contract between the on-device agent loop and the engines that run a
 * model (transformers.js in a worker, Chrome's Prompt API). A provider only
 * generates; the loop owns tools, validation and the conversation.
 */
import type { JSONSchema } from "@web-agents/core";

/** Whether a provider can run, and what it needs first. */
export type ProviderAvailability =
  | { state: "available" }
  | { state: "needs-download"; bytes?: number; note?: string }
  | { state: "downloading"; progress: number }
  | { state: "unavailable"; reason: string };

/**
 * How a model writes a tool call: `<tool_call>{json}</tool_call>` (Qwen, Hermes) or
 * `<|tool_call_start|>[name(arg="x")]<|tool_call_end|>` (Liquid LFM2).
 */
export type CallFormat = "tags" | "pythonic";

/** A tool as small models see it: compact schema, short description. */
export interface CompactTool {
  name: string;
  description: string;
  parameters: JSONSchema;
}

/** A turn of the prompt. `tool` turns carry a tool's result back to the model. */
export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  /** The tool's name, on `tool` turns. */
  name?: string;
}

/** One generation. */
export interface GenerateRequest {
  system: string;
  messages: ChatTurn[];
  /** At most a handful, compacted (see rankTools). */
  tools: CompactTool[];
  signal: AbortSignal;
  /** Raw text as it's generated (the loop filters tool-call markup out). */
  onToken?(delta: string): void;
}

/** A generation's raw text: the loop parses tool calls out of it. */
export interface GenerateResult {
  text: string;
}

/** An engine that can run a model in this browser. */
export interface LocalProvider {
  readonly id: "transformers" | "prompt-api" | (string & {});
  readonly label: string;
  /** List the tools in the prompt text (no chat-template tools support). */
  readonly toolsInline?: boolean;
  /** How the model writes tool calls (and so how its earlier calls go back into the history). Default "tags". */
  readonly callFormat?: CallFormat;
  /** Set once the provider found it can't run here after all: the adapter moves on to the next provider. */
  readonly broken?: string;
  availability(): Promise<ProviderAvailability>;
  /** Download / load the model. `onProgress` gets 0–1. Aborting stops the download. */
  prepare(onProgress: (progress: number) => void, signal?: AbortSignal): Promise<void>;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  /**
   * Whether a prompt fits the model's input window (with room left for the reply). The loop then offers fewer tools
   * and less history until it does. Omitted: everything fits.
   */
  fits?(req: Pick<GenerateRequest, "system" | "messages" | "tools">): Promise<boolean>;
  /** Free the model (terminate the worker, destroy the session). */
  dispose?(): void;
}
