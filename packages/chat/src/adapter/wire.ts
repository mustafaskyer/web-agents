/**
 * The wire between the chat's own message shape and AI SDK's UI message
 * stream protocol. Pure: no DOM, so the server handler imports it too.
 *
 *   toUIMessages(history)        AgentMessage[] → UIMessage[] (the server feeds them to convertToModelMessages)
 *   readParts(body, messageId)   an SSE response body → AgentStreamPart[] as they arrive
 */
import type { UIMessage, UIMessageChunk } from "ai";
import { CANCELLED } from "../shared";
import type { AgentMessage, AgentPart, AgentStreamPart, ToolOutput } from "../types";

/** Longest tool text sent back to the model; the rest is cut with a marker. */
export const MAX_TOOL_TEXT = 4000;

/** The tool's result as the model will read it, with long text truncated. */
export function toolOutputForModel(output: ToolOutput): ToolOutput {
  return {
    ...output,
    content: output.content.map((c) =>
      c.type === "text" && c.text && c.text.length > MAX_TOOL_TEXT ? { ...c, text: `${c.text.slice(0, MAX_TOOL_TEXT)}…(truncated)` } : c,
    ),
  };
}

/** The text of a tool result, for cards and error messages. */
export const outputText = (output: ToolOutput | undefined): string =>
  (output?.content ?? []).map((c) => (c.type === "text" ? c.text : "")).join("\n");

type UIPart = UIMessage["parts"][number];

function toUIPart(part: AgentPart): UIPart | null {
  if (part.type === "text") return part.text ? { type: "text", text: part.text } : null;
  if (part.type === "reasoning") return { type: "reasoning", text: part.text, providerMetadata: part.providerMetadata as never };
  const base = { type: "dynamic-tool" as const, toolName: part.name, toolCallId: part.id, input: part.input ?? {} };
  if (part.state === "done" && part.output) return { ...base, state: "output-available", output: toolOutputForModel(part.output) };
  const errorText =
    part.state === "cancelled"
      ? CANCELLED
      : part.state === "error"
        ? part.error || outputText(part.output) || "The tool failed."
        : "The tool didn't finish (the conversation was interrupted).";
  return { ...base, state: "output-error", errorText };
}

/** The conversation as AI SDK UI messages (for `convertToModelMessages`). Messages left empty (a reply stopped before it began) are skipped. */
export function toUIMessages(messages: readonly AgentMessage[]): UIMessage[] {
  return messages
    .map((m) => ({ id: m.id, role: m.role, parts: m.parts.map(toUIPart).filter((p): p is UIPart => p !== null) }))
    .filter((m) => m.parts.length > 0);
}

/** Split a server-sent-events body into the JSON chunks of the UI message stream. */
async function* sseChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<UIMessageChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        const event = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf("\n\n");
        const data = event
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        yield JSON.parse(data) as UIMessageChunk;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Turn a UI message stream response into stream parts for the assistant
 * message `messageId`. Text arrives as deltas; each tool call once its input
 * is complete; signed reasoning once it ends (to be sent back next request).
 */
export async function* readParts(body: ReadableStream<Uint8Array>, messageId: string): AsyncGenerator<AgentStreamPart> {
  const reasoning = new Map<string, { text: string; providerMetadata?: Record<string, Record<string, unknown>> }>();
  for await (const chunk of sseChunks(body)) {
    switch (chunk.type) {
      case "text-delta":
        if (chunk.delta) yield { type: "text-delta", messageId, delta: chunk.delta };
        break;
      case "reasoning-start":
        reasoning.set(chunk.id, { text: "", providerMetadata: chunk.providerMetadata as never });
        break;
      case "reasoning-delta": {
        const r = reasoning.get(chunk.id);
        if (r) r.text += chunk.delta;
        break;
      }
      case "reasoning-end": {
        const r = reasoning.get(chunk.id);
        reasoning.delete(chunk.id);
        // The signature arrives on the end chunk.
        const providerMetadata = (chunk.providerMetadata ?? r?.providerMetadata) as never;
        yield { type: "reasoning", messageId, text: r?.text ?? "", providerMetadata };
        break;
      }
      case "tool-input-available":
        if (!chunk.providerExecuted) yield { type: "tool-call", messageId, id: chunk.toolCallId, name: chunk.toolName, input: chunk.input };
        break;
      case "tool-input-error":
        // The model produced input that doesn't parse: it's still a call the model expects an answer to.
        yield { type: "tool-call", messageId, id: chunk.toolCallId, name: chunk.toolName, input: chunk.input };
        yield { type: "tool-error", id: chunk.toolCallId, error: `Error: ${chunk.errorText}` };
        break;
      case "error":
        yield { type: "error", error: chunk.errorText };
        break;
    }
  }
}
