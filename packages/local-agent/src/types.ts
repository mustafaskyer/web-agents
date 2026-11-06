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
  availability(): Promise<ProviderAvailability>;
  /** Download / load the model. `onProgress` gets 0–1. Aborting stops the download. */
  prepare(onProgress: (progress: number) => void, signal?: AbortSignal): Promise<void>;
  generate(req: GenerateRequest): Promise<GenerateResult>;
  /** Free the model (terminate the worker, destroy the session). */
  dispose?(): void;
}
