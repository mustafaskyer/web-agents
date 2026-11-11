"use client";
/** The model's reasoning as shadcn/ui's Reasoning pattern: "Thinking" while it streams, "Thought" after, text inside. */
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceLine, TraceTitle } from "@/components/ui/trace";

export type AgentReasoningPart = Extract<UIMessage["parts"][number], { type: "reasoning" }>;

export function AgentReasoning({ part }: { part: AgentReasoningPart }) {
  const streaming = part.state === "streaming";
  if (!part.text.trim() && !streaming) return null;
  return (
    <Trace data-slot="agent-reasoning">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={streaming ? "running" : undefined}>
            <TraceTitle>{streaming ? "Thinking" : "Thought"}</TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Streamdown>{part.text}</Streamdown>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
