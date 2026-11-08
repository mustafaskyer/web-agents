/**
 * A conversation with an agent about this page: the adapter runs the model
 * loop, the page's tools run through `callModelContextTool` (cursor and all),
 * and core agent events mark a call that's waiting for the person to confirm.
 * The conversation survives route changes and reloads (sessionStorage).
 */
import { onAgentEvent } from "@web-agents/core";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { newId } from "../shared";
import { callModelContextTool, listToolDescriptors } from "../tools";
import type { AdapterStatus, AgentAdapter, AgentMessage, ToolDescriptor } from "../types";
import { useAdapterStatus } from "./use-adapter-status";
import { initialSession, resumable, type SessionError, type SessionState, sessionReducer } from "./reducer";

/** Options for `useAgentSession`. */
export interface UseAgentSessionOptions {
  /** sessionStorage key for the conversation; `false` keeps it in memory only. Default "web-agents:chat". */
  storageKey?: string | false;
}

/** A live conversation: state plus the actions a chat UI needs. */
export interface AgentSession {
  messages: AgentMessage[];
  status: SessionState["status"];
  error?: SessionError;
  /** The page's tools right now (also what the next model step sees). */
  tools: ToolDescriptor[];
  adapterStatus: AdapterStatus;
  send(text: string): void;
  stop(): void;
  /** Run again from the last user message. */
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

/** A conversation with `adapter` about this page (what <AgentChat> renders; use it to build your own chat UI). */
export function useAgentSession(adapter: AgentAdapter, { storageKey = "web-agents:chat" }: UseAgentSessionOptions = {}): AgentSession {
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
  const [tools, setTools] = useState<ToolDescriptor[]>([]);
  const toolsRef = useRef(tools);
  const refreshTools = useCallback(async (): Promise<ToolDescriptor[]> => {
    const next = await listToolDescriptors().catch(() => []);
    toolsRef.current = next;
    setTools(next);
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
      try {
        for await (const part of adapter.run({
          messages,
          get tools() {
            return toolsRef.current;
          },
          signal: ctrl.signal,
          callTool: async (call) => {
            const output = await callModelContextTool(call, { signal: ctrl.signal });
            // The call may have changed the page (a navigation, a form appearing): let its tools settle first.
            await toolsSettled();
            await refreshTools();
            return output;
          },
        })) {
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
    [adapter, refreshTools],
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

  return { messages: state.messages, status: state.status, error: state.error, tools, adapterStatus, send, stop, retry, reset };
}
