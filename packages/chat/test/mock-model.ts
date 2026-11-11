/** A scripted language model for tests: each call streams the next script (text and/or tool calls). */
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";

export type Step = {
  text?: string;
  reasoning?: { text: string; signature: string };
  calls?: { id: string; name: string; input: unknown }[];
};

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function partsFor(step: Step): LanguageModelV4StreamPart[] {
  const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }];
  if (step.reasoning) {
    parts.push(
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", delta: step.reasoning.text },
      { type: "reasoning-end", id: "r1", providerMetadata: { anthropic: { signature: step.reasoning.signature } } },
    );
  }
  if (step.text) {
    parts.push({ type: "text-start", id: "t1" });
    for (const word of step.text.split(/(?<= )/)) parts.push({ type: "text-delta", id: "t1", delta: word });
    parts.push({ type: "text-end", id: "t1" });
  }
  for (const c of step.calls ?? []) parts.push({ type: "tool-call", toolCallId: c.id, toolName: c.name, input: JSON.stringify(c.input) });
  parts.push({ type: "finish", usage, finishReason: { unified: step.calls?.length ? "tool-calls" : "stop", raw: undefined } });
  return parts;
}

/** A model that plays `steps` in order (the last one repeats). */
export function scriptedModel(steps: Step[]): MockLanguageModelV4 {
  let i = 0;
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: convertArrayToReadableStream(partsFor(steps[Math.min(i++, steps.length - 1)]!)) }),
  });
}
