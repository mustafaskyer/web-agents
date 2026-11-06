/**
 * Tool calls out of a small model's free text. Small models drift from the
 * format, so this accepts the common shapes, repairs the common mistakes once,
 * and never throws: anything it can't read stays prose.
 *
 *   <tool_call>{"name": "add_to_cart", "arguments": {"qty": 2}}</tool_call>   Qwen / Hermes
 *   ```json {"name": …, "arguments": …} ```                                     fenced
 *   {"type": "tool_call", "name": …, "arguments": …}                           Prompt API (constrained)
 */

/** A call the model made, by name, with object arguments. */
export interface ParsedCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** What a reply contained: its prose, valid calls, and errors for calls it got wrong. */
export interface ParseResult {
  text: string;
  calls: ParsedCall[];
  errors: string[];
}

const MAX_INPUT = 32 * 1024;
// a small model may never close the tag (or end it with a stray character): the block then runs to the next call or the end
const TOOL_CALL = /<tool_call>([\s\S]*?)(?:<\/tool_call>|(?=<tool_call>)|$)/g;
const FENCED = /```(?:json)?\s*([\s\S]*?)```/;

/** Remove reasoning (`<think>…</think>`, or an unterminated `<think>` running to the end). */
export const stripThinking = (text: string): string => text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");

/**
 * The JSON object at the start of `raw`, closed if the model stopped early: text after the object goes, and missing
 * closing braces/brackets are added. `{"name": "open_cart", "arguments": {}〉` → `{"name": "open_cart", "arguments": {}}`.
 */
function balance(raw: string): string {
  const start = raw.indexOf("{");
  if (start === -1) return raw;
  const open: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") open.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      open.pop();
      if (open.length === 0) return raw.slice(start, i + 1);
    }
  }
  // ran out: keep what was written up to its last complete value, then close
  const body = raw.slice(start).replace(/[^}\]"\d\w]+$/u, "");
  return body + [...open].reverse().join("");
}

function parseJson(raw: string): unknown {
  for (const text of [raw, balance(raw)]) {
    try {
      return JSON.parse(text);
    } catch {
      // one lenient pass: trailing commas, single quotes
      try {
        return JSON.parse(text.replace(/,\s*([}\]])/g, "$1").replace(/'/g, '"'));
      } catch {
        // next candidate
      }
    }
  }
  return undefined;
}

type Outcome = { call: ParsedCall } | { error: string } | null;

function toCall(value: unknown, toolNames: ReadonlySet<string>): Outcome {
  if (!value || typeof value !== "object") return null;
  const v = value as { name?: unknown; arguments?: unknown; parameters?: unknown; type?: unknown };
  if (typeof v.name !== "string") return null;
  if (!toolNames.has(v.name)) return { error: `Unknown tool "${v.name}". Available: ${[...toolNames].join(", ") || "none"}.` };
  let args = v.arguments ?? v.parameters ?? {};
  if (typeof args === "string") args = parseJson(args) ?? {};
  if (!args || typeof args !== "object" || Array.isArray(args)) return { error: `Arguments for "${v.name}" must be a JSON object.` };
  return { call: { name: v.name, arguments: args as Record<string, unknown> } };
}

/** Parse a reply. Unknown tool names become errors (fed back to the model), never calls. */
export function parseToolCalls(raw: string, toolNames: ReadonlySet<string>): ParseResult {
  const text = stripThinking(raw.slice(0, MAX_INPUT));
  const calls: ParsedCall[] = [];
  const errors: string[] = [];
  const take = (outcome: Outcome, source: string): boolean => {
    if (!outcome) {
      errors.push(`Couldn't read a tool call: ${source.slice(0, 120)}`);
      return false;
    }
    if ("error" in outcome) errors.push(outcome.error);
    else calls.push(outcome.call);
    return true;
  };

  // 1. <tool_call> blocks
  const blocks = [...text.matchAll(TOOL_CALL)];
  if (blocks.length) {
    for (const [, body] of blocks) take(toCall(parseJson(body!.trim()), toolNames), body!.trim());
    return { text: text.replace(TOOL_CALL, "").trim(), calls, errors };
  }

  // 2. a fenced JSON block, or 3. the whole reply as JSON
  const fenced = text.match(FENCED);
  const candidate = fenced ? fenced[1]!.trim() : text.trim();
  if (candidate.startsWith("{")) {
    const value = parseJson(candidate);
    if (value && typeof value === "object") {
      const v = value as { type?: unknown; text?: unknown };
      if (v.type === "message" && typeof v.text === "string") return { text: v.text, calls, errors }; // Prompt API prose
      const outcome = toCall(value, toolNames);
      if (outcome) {
        take(outcome, candidate);
        return { text: fenced ? text.replace(FENCED, "").trim() : "", calls, errors };
      }
    }
  }
  return { text: text.trim(), calls, errors };
}

/**
 * Streaming filter: the prose part of a reply as it arrives, holding back
 * anything that might be the start of `<tool_call>` or `<think>` markup.
 */
export function createProseFilter(): { push(delta: string): string; flush(): string } {
  let buffer = "";
  let inside: "tool" | "think" | null = null;
  const OPEN = { "<tool_call>": "tool", "<think>": "think" } as const;
  const CLOSE = { tool: "</tool_call>", think: "</think>" } as const;

  const drain = (final: boolean): string => {
    let out = "";
    for (;;) {
      if (inside) {
        const end = buffer.indexOf(CLOSE[inside]);
        if (end === -1) {
          if (final) buffer = "";
          return out;
        }
        buffer = buffer.slice(end + CLOSE[inside].length);
        inside = null;
        continue;
      }
      const lt = buffer.indexOf("<");
      if (lt === -1) {
        out += buffer;
        buffer = "";
        return out;
      }
      out += buffer.slice(0, lt);
      buffer = buffer.slice(lt);
      const tag = (Object.keys(OPEN) as (keyof typeof OPEN)[]).find((t) => buffer.startsWith(t));
      if (tag) {
        inside = OPEN[tag];
        buffer = buffer.slice(tag.length);
        continue;
      }
      // could still become a tag: wait for more text (unless this is the end)
      if (!final && Object.keys(OPEN).some((t) => t.startsWith(buffer))) return out;
      out += buffer[0];
      buffer = buffer.slice(1);
    }
  };
  return {
    push(delta) {
      buffer += delta;
      return drain(false);
    },
    flush: () => drain(true),
  };
}
