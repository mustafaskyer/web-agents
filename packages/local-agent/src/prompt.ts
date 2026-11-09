/**
 * Prompts for small on-device models: short rules, one exact output format, a
 * worked example, and the recent conversation only.
 */
import type { AgentMessage } from "@webmcp-agents/chat";
import { toPythonic } from "./pythonic";
import type { CallFormat, ChatTurn, CompactTool } from "./types";

const MAX_TURNS = 12;
const MAX_TOOL_TEXT = 1500;
/** @webmcp-agents/chat's CANCELLED (a type-only dependency here: importing its runtime would pull in the widget). */
const CANCELLED = "Error [cancelled]: Cancelled by the user.";

const RULES = `You are an assistant inside the web page the user is looking at. You act on the page with tools; the user watches each step.
You do the work yourself: when the user asks for something a tool here can do, call it. Never tell the user to click, open or use something you can do.
How to work:
1. Work out what the user wants: something to find, a page to open, or an action (add, remove, book, buy).
2. Take one step with the best tool. To find something, search with the key word only ("bag", not "I want a beautiful bag").
3. Read the result, then take the next step. If nothing was found, try a simpler word or a likely category before giving up.
4. When you found what they asked for, or need them to choose, reply in one or two short sentences. Ask before buying or adding something they didn't ask to add.
Rules:
- Only use the tools listed. Never invent tool names or arguments; ask for missing values.
- Some tools wait for the user to confirm on the page (orders, bookings, deletions). If a result says it was cancelled, tell the user; never claim it succeeded.
- Never say you did something unless a tool result says it happened.
- A result starting with "Error [code]:" failed. interrupted, timeout or unavailable: check the page and try again. invalid_input: fix the arguments. needs_user: ask the user. cancelled: stop and tell the user. failed: explain briefly.
- Asked what you can do, say in plain words what the tools below let you do here.`;

const TAG_FORMAT = `To use a tool, reply ONLY with:
<tool_call>{"name": "TOOL_NAME", "arguments": {...}}</tool_call>
Otherwise reply in plain text.`;

const PYTHONIC_FORMAT = `To use a tool, reply ONLY with:
<|tool_call_start|>[TOOL_NAME(argument="value")]<|tool_call_end|>
Otherwise reply in plain text.`;

const JSON_FORMAT = `Reply with JSON only: {"type": "tool_call", "name": "TOOL_NAME", "arguments": {...}} to use a tool, or {"type": "message", "text": "..."} to answer.`;

const firstSentence = (s: string): string => s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s;

/** A plausible example call for the first tool: required args filled with their first enum value or a placeholder. */
function example(tool: CompactTool, json: boolean, format: CallFormat): string {
  const s = tool.parameters as { properties?: Record<string, { type?: string; enum?: unknown[] }>; required?: string[] };
  const args: Record<string, unknown> = {};
  for (const key of s.required ?? Object.keys(s.properties ?? {}).slice(0, 1)) {
    const p = s.properties?.[key];
    args[key] = p?.enum?.[0] ?? (p?.type === "number" || p?.type === "integer" ? 1 : p?.type === "boolean" ? true : "…");
  }
  if (json) return JSON.stringify({ type: "tool_call", name: tool.name, arguments: args });
  return callMarkup(tool.name, args, format);
}

/** A call as `format` writes it. */
function callMarkup(name: string, args: Record<string, unknown>, format: CallFormat): string {
  return format === "pythonic"
    ? `<|tool_call_start|>[${toPythonic(name, args)}]<|tool_call_end|>`
    : `<tool_call>${JSON.stringify({ name, arguments: args })}</tool_call>`;
}

/** What `buildLocalSystemPrompt` adds to the fixed rules. */
export interface LocalPromptOptions {
  /** The page's path, for context. */
  path?: string;
  /** The page's title and main heading: without them a small model thinks the page is empty. */
  page?: { title?: string; heading?: string };
  /** Every tool offered this step: listed in plain words (name and description), whatever the call format. */
  tools?: CompactTool[];
  /**
   * Tools listed in the prompt text, with the JSON reply format (the Prompt API path, whose output is JSON-constrained).
   * Without it the tools go through the chat template and calls use `<tool_call>` tags (the Qwen path).
   */
  toolsInline?: CompactTool[];
  /** For the worked example. */
  firstTool?: CompactTool;
  /** The model's call format (chat-template path). Default "tags". */
  format?: CallFormat;
  /** What the site is and how its tools fit together, from the site (`createLocalAdapter({ instructions })`). */
  instructions?: string;
}

/** The system prompt (well under ~600 tokens). */
export function buildLocalSystemPrompt({
  path,
  page,
  tools,
  toolsInline,
  firstTool,
  format = "tags",
  instructions,
}: LocalPromptOptions = {}): string {
  const json = !!toolsInline;
  const parts = [RULES, json ? JSON_FORMAT : format === "pythonic" ? PYTHONIC_FORMAT : TAG_FORMAT];
  if (instructions?.trim()) parts.push(`About this site:\n${instructions.trim()}`);
  const first = firstTool ?? toolsInline?.[0] ?? tools?.[0];
  if (first) parts.push(`Example:\n${example(first, json, format)}`);
  if (toolsInline?.length)
    parts.push(`Tools:\n${toolsInline.map((t) => `- ${t.name}: ${t.description} Arguments: ${JSON.stringify(t.parameters)}`).join("\n")}`);
  // the chat template carries each tool's full description: this list is the short version, for orientation
  else if (tools?.length) parts.push(`Tools on this page:\n${tools.map((t) => `- ${t.name}: ${firstSentence(t.description)}`).join("\n")}`);
  else parts.push("This page has no tools right now: you can only answer in words.");
  const where = [
    page?.title && `"${page.title}"`,
    page?.heading && page.heading !== page.title && `showing "${page.heading}"`,
    path && `at ${path}`,
  ]
    .filter(Boolean)
    .join(", ");
  if (where) parts.push(`The user is on the page ${where}.`);
  return parts.join("\n\n");
}

/** A tool result's text. */
export const textOf = (output: { content?: Array<{ type: string; text?: string }> } | undefined): string =>
  (output?.content ?? []).map((c) => c.text ?? "").join("\n");

/** The conversation as chat-template turns: the model sees its own earlier calls and their results. Last 12 turns. */
export function toChatTemplateMessages(history: readonly AgentMessage[], format: CallFormat = "tags"): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of history) {
    if (m.role === "user") {
      turns.push({ role: "user", content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n") });
      continue;
    }
    let text = "";
    const results: ChatTurn[] = [];
    for (const p of m.parts) {
      if (p.type === "text") text += p.text;
      else if (p.type === "tool") {
        text += callMarkup(p.name, (p.input ?? {}) as Record<string, unknown>, format);
        const result = p.state === "cancelled" ? CANCELLED : p.error || textOf(p.output) || "(no result)";
        results.push({ role: "tool", name: p.name, content: result.slice(0, MAX_TOOL_TEXT) });
      }
    }
    if (text) turns.push({ role: "assistant", content: text });
    turns.push(...results);
  }
  // start the window on a user turn
  let start = Math.max(0, turns.length - MAX_TURNS);
  while (start > 0 && turns[start]!.role !== "user") start--;
  return turns.slice(start);
}
