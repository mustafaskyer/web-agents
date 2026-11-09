/**
 * A conversation with an agent about this page: the adapter runs the model
 * loop, the page's tools run through `callModelContextTool` (cursor and all),
 * and core agent events mark a call that's waiting for the person to confirm.
 * The conversation survives route changes and reloads (sessionStorage).
 *
 * With a WebAgent (`defineWebAgent`), the model sees only the agent's tools, plus one `delegate_to_<id>` tool per
 * sub-agent. A delegate call runs the sub-agent's own loop on the same adapter, right here: its page tools still run
 * under the cursor, and its stream is kept nested under the call, so the chat can show it.
 */
import { onAgentEvent } from "@webmcp-agents/core";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DELEGATE_PREFIX, isDelegateTool, selectTools, type WebAgent } from "../agent";
import { CANCELLED, newId } from "../shared";
import { callModelContextTool, listToolDescriptors } from "../tools";
import type { AdapterStatus, AgentAdapter, AgentMessage, AgentRunRequest, AgentStreamPart, ToolDescriptor, ToolOutput } from "../types";
import { useAdapterStatus } from "./use-adapter-status";
import { initialSession, resumable, type SessionError, type SessionState, sessionReducer } from "./reducer";

/** Options for `useAgentSession`. */
export interface UseAgentSessionOptions {
  /** sessionStorage key for the conversation; `false` keeps it in memory only. Default "web-agents:chat". */
  storageKey?: string | false;
  /** The agent for this page (`defineWebAgent`): its tool subset, instructions and sub-agents. Default: every page tool, no instructions. */
  agent?: WebAgent;
}

/** A live conversation: state plus the actions a chat UI needs. */
export interface AgentSession {
  messages: AgentMessage[];
  status: SessionState["status"];
  error?: SessionError;
  /** The tools the model sees right now: the page's tools through the agent's filter, plus its delegate tools. */
  tools: ToolDescriptor[];
  adapterStatus: AdapterStatus;
  /** The agent in use, when one was set. */
  agent?: WebAgent;
  send(text: string): void;
  stop(): void;
  /** Run the interrupted turn again from its last finished tool call (see `resumable`): nothing is done twice. */
  retry(): void;
  /** Start a new conversation. */
  reset(): void;
}

const MAX_STORED = 60;

function load(key: string | false): SessionState {
  if (!key || typeof sessionStorage === "undefined") return initialSession;
  try {
    const messages = JSON.parse(sessionStorage.getItem(key) ?? "[]") as AgentMessage[];
    // a reload ended any call that was running: show it as cancelled
    return Array.isArray(messages) ? sessionReducer({ messages, status: "idle" }, { type: "stop" }) : initialSession;
  } catch {
    return initialSession;
  }
}

/**
 * Resolve once the page's tools have stopped changing: no `toolchange` for
 * `quiet` ms (a route renders, its forms register), or after `max` ms.
 */
function toolsSettled(quiet = 150, max = 1500): Promise<void> {
  const mc = typeof document === "undefined" ? undefined : document.modelContext;
  if (!mc) return Promise.resolve();
  return new Promise((resolve) => {
    let timer = setTimeout(done, quiet);
    const cap = setTimeout(done, max);
    function onChange(): void {
      clearTimeout(timer);
      timer = setTimeout(done, quiet);
    }
    function done(): void {
      clearTimeout(timer);
      clearTimeout(cap);
      mc!.removeEventListener("toolchange", onChange);
      resolve();
    }
    mc.addEventListener("toolchange", onChange);
  });
}

const text = (t: string): ToolOutput => ({ content: [{ type: "text", text: t }] });
const failed = (t: string): ToolOutput => ({ content: [{ type: "text", text: t }], isError: true });

/** A conversation with `adapter` about this page (what <AgentChat> renders; use it to build your own chat UI). */
export function useAgentSession(
  adapter: AgentAdapter,
  { storageKey = "web-agents:chat", agent }: UseAgentSessionOptions = {},
): AgentSession {
  const [state, dispatch] = useReducer(sessionReducer, storageKey, load);
  const latest = useRef(state);
  latest.current = state;

  // ---------- persistence ----------
  useEffect(() => {
    if (!storageKey) return;
    // A conversation interrupted by a reload has no live tool calls: store finished messages only.
    sessionStorage.setItem(storageKey, JSON.stringify(state.messages.slice(-MAX_STORED)));
  }, [state.messages, storageKey]);

  // ---------- the page's tools ----------
  const [pageTools, setPageTools] = useState<ToolDescriptor[]>([]);
  const toolsRef = useRef(pageTools);
  const refreshTools = useCallback(async (): Promise<ToolDescriptor[]> => {
    const next = await listToolDescriptors().catch(() => []);
    toolsRef.current = next;
    setPageTools(next);
    return next;
  }, []);
  useEffect(() => {
    void refreshTools();
    const mc = document.modelContext;
    if (!mc) return;
    const onChange = (): void => void refreshTools();
    mc.addEventListener("toolchange", onChange);
    return () => mc.removeEventListener("toolchange", onChange);
  }, [refreshTools]);

  // ---------- adapter status ----------
  const adapterStatus = useAdapterStatus(adapter);

  // ---------- confirmation parking, from the agent cursor ----------
  useEffect(
    () =>
      onAgentEvent((e) => {
        if (latest.current.status !== "streaming") return;
        if (e.type === "park") dispatch({ type: "toolPhase", name: e.tool, state: "awaiting-confirmation", prompt: e.prompt });
        else if (e.type === "start") dispatch({ type: "toolPhase", name: e.tool, state: "running" });
      }),
    [],
  );

  // ---------- runs ----------
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (messages: AgentMessage[]) => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      // The page may still be rendering (a route the person just opened): start from its settled tools.
      await toolsSettled(100);
      await refreshTools();
      if (ctrl.signal.aborted) return; // stopped (or superseded) while the page settled

      /**
       * The request one agent sees: its tools (read fresh each step), its definition, and a `callTool` that runs page
       * tools under the cursor and `delegate_to_*` tools as nested runs of the sub-agent.
       */
      const makeRequest = (history: AgentMessage[], def: WebAgent | undefined): AgentRunRequest => ({
        messages: history,
        get tools() {
          return selectTools(def, toolsRef.current);
        },
        signal: ctrl.signal,
        agent: def,
        callTool: async (call) => {
          const sub = isDelegateTool(call.name) ? def?.agents.find((a) => a.id === call.name.slice(DELEGATE_PREFIX.length)) : undefined;
          if (sub) return runDelegate(sub, call);
          const output = await callModelContextTool(call, { signal: ctrl.signal });
          // The call may have changed the page (a navigation, a form appearing): let its tools settle first.
          await toolsSettled();
          await refreshTools();
          return output;
        },
      });

      /**
       * A sub-agent's run: one user message (the task), its own tools and step budget, on the same adapter. Its parts are
       * dispatched nested under the delegate call; its final text is the call's output. Bounded by the sub-agent's
       * `maxSteps`, not by the page tool timeout (it isn't a page tool).
       */
      async function runDelegate(sub: WebAgent, call: { id: string; name: string; input: unknown }): Promise<ToolOutput> {
        const input = (call.input ?? {}) as { task?: unknown; context?: unknown };
        const task = typeof input.task === "string" ? input.task.trim() : "";
        if (!task) return failed(`Error [invalid_input]: delegate_to_${sub.id} needs a "task" string.`);
        const prompt = typeof input.context === "string" && input.context.trim() ? `${task}\n\nContext: ${input.context.trim()}` : task;
        const nested = (part: AgentStreamPart): void => {
          if (controller.current === ctrl) dispatch({ type: "part", part, within: call.id });
        };
        const history: AgentMessage[] = [];
        let reason: "stop" | "max-steps" | "aborted" | "error" = "stop";
        let error = "";
        try {
          for await (const part of adapter.run(
            makeRequest([{ id: newId("u"), role: "user", parts: [{ type: "text", text: prompt }] }], sub),
          )) {
            if (controller.current !== ctrl) break; // superseded or stopped
            nested(part);
            // our own copy of the sub-agent's text (the reducer's copy lives in React state)
            if (part.type === "message-start") history.push({ id: part.messageId, role: "assistant", parts: [] });
            else if (part.type === "text-delta") {
              const m = history.find((h) => h.id === part.messageId);
              const last = m?.parts.at(-1);
              if (last?.type === "text") last.text += part.delta;
              else m?.parts.push({ type: "text", text: part.delta });
            } else if (part.type === "finish") reason = part.reason;
            else if (part.type === "error") {
              reason = "error";
              error = part.error;
            }
          }
        } catch (err) {
          reason = "error";
          error = err instanceof Error ? err.message : String(err);
        }
        if (ctrl.signal.aborted) return failed(CANCELLED);
        if (reason === "error") return failed(`Error [failed]: The ${sub.id} agent failed: ${error}`);
        const answer = history
          .flatMap((m) => m.parts)
          .map((p) => (p.type === "text" ? p.text : ""))
          .filter((x) => x.trim())
          .join("\n\n")
          .trim();
        if (answer) return text(answer);
        return reason === "max-steps"
          ? failed(`Error [failed]: The ${sub.id} agent stopped after ${sub.maxSteps ?? "its"} steps without finishing.`)
          : text(`The ${sub.id} agent finished without a summary.`);
      }

      try {
        for await (const part of adapter.run(makeRequest(messages, agent))) {
          if (controller.current !== ctrl) return; // superseded
          dispatch({ type: "part", part });
        }
      } catch (err) {
        if (controller.current === ctrl && !ctrl.signal.aborted) {
          dispatch({ type: "part", part: { type: "error", error: err instanceof Error ? err.message : String(err) } });
        }
      } finally {
        if (controller.current === ctrl) controller.current = null;
      }
    },
    [adapter, agent, refreshTools],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || latest.current.status === "streaming") return;
      const id = newId("u");
      const messages: AgentMessage[] = [...latest.current.messages, { id, role: "user", parts: [{ type: "text", text: trimmed }] }];
      dispatch({ type: "send", id, text: trimmed });
      void run(messages);
    },
    [run],
  );

  // Retry continues the interrupted turn from its last finished tool call (see `resumable`): nothing is done twice.
  const retry = useCallback(() => {
    const { messages, status } = latest.current;
    if (!messages.some((m) => m.role === "user") || status === "streaming") return;
    dispatch({ type: "retry" });
    void run(resumable(messages));
  }, [run]);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    dispatch({ type: "stop" });
  }, []);

  const reset = useCallback(() => {
    stop();
    dispatch({ type: "reset" });
  }, [stop]);

  return {
    messages: state.messages,
    status: state.status,
    error: state.error,
    tools: selectTools(agent, pageTools),
    adapterStatus,
    agent,
    send,
    stop,
    retry,
    reset,
  };
}
