/**
 * The conversation as plain data: messages, whether a run is streaming, and
 * the last error. Pure, so it's tested in Node; the hook feeds it adapter
 * stream parts and core agent events.
 */
import { isCancelled } from "../shared";
import type { AgentMessage, AgentPart, AgentStreamPart, ToolCallState } from "../types";

/** The last run's failure, with a code the widget can explain (offline, rate limited…). */
export interface SessionError {
  message: string;
  code?: Extract<AgentStreamPart, { type: "error" }>["code"];
}

/** A conversation: its messages, whether a run is streaming, and the last error. */
export interface SessionState {
  messages: AgentMessage[];
  status: "idle" | "streaming" | "error";
  error?: SessionError;
}

/** What can happen to a session. */
export type SessionAction =
  | { type: "send"; id: string; text: string }
  | { type: "part"; part: AgentStreamPart }
  /** A core agent event about a running tool, matched by tool name (calls run one at a time). */
  | { type: "toolPhase"; name: string; state: "running" | "awaiting-confirmation"; prompt?: string }
  | { type: "stop" }
  /** Run again from the last user message: drops what came after it. */
  | { type: "retry" }
  | { type: "reset" };

/** An empty conversation. */
export const initialSession: SessionState = { messages: [], status: "idle" };

type ToolPart = Extract<AgentPart, { type: "tool" }>;
const OPEN: readonly ToolCallState[] = ["running", "awaiting-confirmation"];

/** Replace the tool part(s) matching `match` in every message. */
function updateTools(messages: AgentMessage[], match: (p: ToolPart) => boolean, patch: (p: ToolPart) => Partial<ToolPart>): AgentMessage[] {
  let changed = false;
  const next = messages.map((m) => {
    if (!m.parts.some((p) => p.type === "tool" && match(p))) return m;
    changed = true;
    return { ...m, parts: m.parts.map((p) => (p.type === "tool" && match(p) ? { ...p, ...patch(p) } : p)) };
  });
  return changed ? next : messages;
}

function updateMessage(messages: AgentMessage[], id: string, update: (parts: AgentPart[]) => AgentPart[]): AgentMessage[] {
  return messages.map((m) => (m.id === id ? { ...m, parts: update(m.parts) } : m));
}

const cancelOpen = (messages: AgentMessage[]): AgentMessage[] =>
  updateTools(
    messages,
    (p) => OPEN.includes(p.state),
    () => ({ state: "cancelled", prompt: undefined }),
  );

function applyPart(state: SessionState, part: AgentStreamPart): SessionState {
  const { messages } = state;
  switch (part.type) {
    case "message-start":
      return { ...state, messages: [...messages, { id: part.messageId, role: "assistant", parts: [] }] };
    case "text-delta":
      return {
        ...state,
        messages: updateMessage(messages, part.messageId, (parts) => {
          const last = parts.at(-1);
          return last?.type === "text"
            ? [...parts.slice(0, -1), { ...last, text: last.text + part.delta }]
            : [...parts, { type: "text", text: part.delta }];
        }),
      };
    case "reasoning":
      return {
        ...state,
        messages: updateMessage(messages, part.messageId, (parts) => [
          ...parts,
          { type: "reasoning", text: part.text, providerMetadata: part.providerMetadata },
        ]),
      };
    case "tool-call":
      return {
        ...state,
        messages: updateMessage(messages, part.messageId, (parts) => [
          ...parts,
          { type: "tool", id: part.id, name: part.name, input: part.input, state: "running" },
        ]),
      };
    case "tool-result":
      return {
        ...state,
        messages: updateTools(
          messages,
          (p) => p.id === part.id,
          () => ({ state: "done", output: part.output, prompt: undefined }),
        ),
      };
    case "tool-error":
      return {
        ...state,
        messages: updateTools(
          messages,
          (p) => p.id === part.id,
          () => ({ state: isCancelled(part.error) ? "cancelled" : "error", error: part.error, prompt: undefined }),
        ),
      };
    case "step-finish":
      return state;
    case "finish":
      return { ...state, status: "idle", messages: part.reason === "aborted" ? cancelOpen(messages) : messages };
    case "error":
      return { ...state, status: "error", error: { message: part.error, code: part.code }, messages: cancelOpen(messages) };
  }
}

/** The session state machine: stream parts, tool phases from the agent cursor, stop, retry, reset. */
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "send":
      return {
        status: "streaming",
        messages: [...state.messages, { id: action.id, role: "user", parts: [{ type: "text", text: action.text }] }],
      };
    case "part":
      return applyPart(state, action.part);
    case "toolPhase": {
      // the newest open call of that tool
      const open = state.messages
        .flatMap((m) => m.parts)
        .filter((p): p is ToolPart => p.type === "tool" && p.name === action.name && OPEN.includes(p.state));
      const target = open.at(-1);
      if (!target || (target.state === action.state && target.prompt === action.prompt)) return state;
      return {
        ...state,
        messages: updateTools(
          state.messages,
          (p) => p === target,
          () => ({ state: action.state, prompt: action.prompt }),
        ),
      };
    }
    case "stop":
      return { ...state, status: "idle", messages: cancelOpen(state.messages) };
    case "retry": {
      const last = state.messages.findLastIndex((m) => m.role === "user");
      if (last === -1) return state;
      return { status: "streaming", messages: state.messages.slice(0, last + 1) };
    }
    case "reset":
      return initialSession;
  }
}
