/**
 * The cloud adapter: Claude on your server (`/api/chat`, see ../server), tools
 * on the page. Each step POSTs the conversation and the page's current tools;
 * the model's reply streams back; any tool calls run here, one at a time (one
 * page, one cursor), and their results go out with the next step.
 *
 * The history only ever grows at the end (outputs are truncated when they are
 * recorded, not later), so each request repeats the last one's prefix: the
 * model's signed reasoning stays valid and the prompt cache keeps hitting.
 */
import { LIMITS, newId } from "../shared";
import type { AdapterStatus, AgentAdapter, AgentMessage, AgentRunRequest, AgentStreamPart } from "../types";
import { outputText, readParts, toolOutputForModel } from "./wire";

/** Options for `createCloudAdapter`. */
export interface CloudAdapterOptions {
  /** The chat endpoint. Default "/api/chat". */
  api?: string;
  /**
   * Tool steps per user message. One more request follows the last step, and the server answers it without tools,
   * so the model sums up. Default 8; keep it equal to the handler's `maxSteps`.
   */
  maxSteps?: number;
  /** Extra request headers (auth, CSRF), or a function returning them per request. */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Injectable for tests and custom transports. Default `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Shown in the adapter switcher. Default "Claude (cloud)". */
  label?: string;
}

const ERROR_CODES: Record<number, Extract<AgentStreamPart, { type: "error" }>["code"]> = {
  400: "bad_request",
  413: "bad_request",
  415: "bad_request",
  429: "rate_limited",
  503: "chat_disabled",
};

const MESSAGES: Record<string, string> = {
  chat_disabled: "Chat isn't configured on this site.",
  rate_limited: "You're sending messages too fast. Try again in a minute.",
  bad_request: "The assistant couldn't read this conversation. Start a new chat.",
  network: "Couldn't reach the assistant. Check your connection and try again.",
};

/** After a failed availability check, try again on the next status() call this many ms later. */
const RECHECK_MS = 10_000;

/**
 * The newest messages that fit the server's cap, starting at a user message. Rare (160 messages is a long chat):
 * dropping the oldest turns costs a prompt-cache miss once, which beats a conversation that can't continue.
 */
function window(history: AgentMessage[]): AgentMessage[] {
  if (history.length <= LIMITS.messages) return history;
  let start = history.length - LIMITS.messages;
  while (start < history.length - 1 && history[start]!.role !== "user") start++;
  return history.slice(start);
}

/** An agent backed by `/api/chat` (Claude on your server); tools run on the page. Create it once per page. */
export function createCloudAdapter(opts: CloudAdapterOptions = {}): AgentAdapter {
  const api = opts.api ?? "/api/chat";
  const maxSteps = opts.maxSteps ?? 8;
  const doFetch = (...args: Parameters<typeof fetch>) => (opts.fetch ?? globalThis.fetch)(...args);
  const headers = (): Record<string, string> => ({
    "content-type": "application/json",
    ...(typeof opts.headers === "function" ? opts.headers() : opts.headers),
  });

  // ---------- status: a GET, re-tried after a failure ----------
  let status: AdapterStatus = { state: "loading" };
  let checking = false;
  let checkedAt = 0;
  const listeners = new Set<() => void>();
  const setStatus = (next: AdapterStatus): void => {
    if (JSON.stringify(next) === JSON.stringify(status)) return;
    status = next;
    for (const l of listeners) l();
  };
  const check = (): void => {
    if (checking || (status.state !== "loading" && (status.state === "ready" || Date.now() - checkedAt < RECHECK_MS))) return;
    checking = true;
    doFetch(api, { headers: headers() })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { enabled?: boolean } | null;
        setStatus(res.ok && body?.enabled ? { state: "ready" } : { state: "unavailable", reason: MESSAGES.chat_disabled! });
      })
      .catch(() => setStatus({ state: "unavailable", reason: MESSAGES.network! }))
      .finally(() => {
        checking = false;
        checkedAt = Date.now();
      });
  };

  return {
    id: "cloud",
    label: opts.label ?? "Claude (cloud)",
    status() {
      if (typeof window !== "undefined") check();
      return status;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async *run(req: AgentRunRequest): AsyncGenerator<AgentStreamPart> {
      const { signal } = req;
      const history: AgentMessage[] = structuredClone(req.messages);
      const aborted = { type: "finish", reason: "aborted" } as const;

      // maxSteps tool steps, then one more request: the server gives it no tools, so the model answers.
      for (let step = 1; step <= maxSteps + 1; step++) {
        if (signal.aborted) return yield aborted;

        // ---------- 1. one model step ----------
        let res: Response;
        try {
          res = await doFetch(api, {
            method: "POST",
            headers: headers(),
            signal,
            body: JSON.stringify({
              messages: window(history),
              tools: req.tools, // read fresh: the page's tools change between steps
              page: typeof location === "undefined" ? undefined : { url: location.href },
            }),
          });
        } catch {
          if (signal.aborted) return yield aborted;
          return yield { type: "error", error: MESSAGES.network!, code: "network" };
        }
        if (!res.ok || !res.body) {
          const code = ERROR_CODES[res.status];
          if (code === "chat_disabled") setStatus({ state: "unavailable", reason: MESSAGES.chat_disabled! });
          return yield { type: "error", error: (code && MESSAGES[code]) || "Something went wrong. Try again.", ...(code && { code }) };
        }
        setStatus({ state: "ready" });

        // ---------- 2. stream the reply into history ----------
        const messageId = newId("a");
        const assistant: AgentMessage = { id: messageId, role: "assistant", parts: [] };
        history.push(assistant);
        yield { type: "message-start", messageId };
        const calls: { id: string; name: string; input: unknown }[] = [];
        try {
          for await (const part of readParts(res.body, messageId)) {
            if (part.type === "error") return yield part;
            if (part.type === "text-delta") {
              const last = assistant.parts.at(-1);
              if (last?.type === "text") last.text += part.delta;
              else assistant.parts.push({ type: "text", text: part.delta });
            } else if (part.type === "reasoning") {
              assistant.parts.push({ type: "reasoning", text: part.text, providerMetadata: part.providerMetadata });
            } else if (part.type === "tool-call") {
              assistant.parts.push({ type: "tool", id: part.id, name: part.name, input: part.input, state: "running" });
              calls.push(part);
            } else if (part.type === "tool-error") {
              // unparseable input: answered with the error, never run
              const tool = assistant.parts.find((p) => p.type === "tool" && p.id === part.id);
              if (tool?.type === "tool") Object.assign(tool, { state: "error", error: part.error });
              const at = calls.findIndex((c) => c.id === part.id);
              if (at !== -1) calls.splice(at, 1);
            }
            yield part;
          }
        } catch {
          if (signal.aborted) return yield aborted;
          return yield { type: "error", error: MESSAGES.network!, code: "network" };
        }
        if (calls.length === 0) return yield { type: "finish", reason: "stop" };
        if (step > maxSteps) break; // the summary request still called tools: stop here

        // ---------- 3. run the tool calls on the page, in order ----------
        for (const call of calls) {
          // recorded truncated, once (here and in the session): later requests repeat exactly what this one sends
          const recorded = toolOutputForModel(await req.callTool(call));
          const tool = assistant.parts.find((p) => p.type === "tool" && p.id === call.id);
          if (tool?.type === "tool") Object.assign(tool, { state: recorded.isError ? "error" : "done", output: recorded });
          yield recorded.isError
            ? { type: "tool-error", id: call.id, error: outputText(recorded) }
            : { type: "tool-result", id: call.id, output: recorded };
          if (signal.aborted) return yield aborted;
        }
        yield { type: "step-finish", step };
      }
      yield { type: "finish", reason: "max-steps" };
    },
  };
}
