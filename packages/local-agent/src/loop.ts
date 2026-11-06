/**
 * The on-device agent loop, the same for every provider: rank the page's
 * tools, generate, parse tool calls, validate them, run them on the page one
 * at a time, feed the results back, repeat. Small models get one chance to fix
 * a bad call per step, a step budget, and a timeout per generation.
 */
import type { AgentMessage, AgentRunRequest, AgentStreamPart } from "@web-agents/chat";
import { buildLocalSystemPrompt, textOf, toChatTemplateMessages } from "./prompt";
import { createProseFilter, type ParsedCall, parseToolCalls } from "./tool-call-parser";
import { rankTools, validateArgs } from "./tools";
import type { ChatTurn, CompactTool, GenerateRequest, GenerateResult, LocalProvider } from "./types";

/** Options for `runLocalAgent` (and the matching `createLocalAdapter` options). */
export interface LocalLoopOptions {
  /** Model steps per user message. Default 6: enough to find, open and add; small models plan poorly beyond that. */
  maxSteps?: number;
  /** Per generation. Default 60 s. */
  stepTimeoutMs?: number;
  /** Most tools shown to the model per step. Default 8. */
  maxTools?: number;
  /** Pass the tools in the prompt text (providers without native chat-template tools). */
  toolsInline?: boolean;
}

const TOO_LONG = "This request is too long for the on-device model. Start a new chat, or try the cloud assistant.";
const TIMEOUT = "The on-device model took too long. Try a shorter request or the cloud assistant.";
const APOLOGY = "Sorry, I couldn't work out how to do that on this page. Try rephrasing, or use the cloud assistant.";
const REPEAT = "I stopped because I was repeating the same action. Tell me what to change, or try the cloud assistant.";

const lastUserText = (messages: readonly AgentMessage[]): string => {
  const m = messages.findLast((x) => x.role === "user");
  return m?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
};
const newId = (): string => (typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `l-${Date.now()}-${Math.random()}`);

/**
 * Generate, yielding the prose (tool-call and thinking markup filtered out) as the tokens arrive; returns the raw
 * result. A queue bridges the provider's callback to the generator.
 */
async function* streamProse(provider: LocalProvider, request: GenerateRequest): AsyncGenerator<string, GenerateResult> {
  const filter = createProseFilter();
  const queue: string[] = [];
  let wake: (() => void) | null = null;
  let settled = false;
  // Race the provider against the signal: a provider (or a browser API) that ignores it must not hang the loop.
  const aborted = new Promise<never>((_, reject) => {
    const fail = (): void => reject(request.signal.reason ?? new DOMException("Aborted", "AbortError"));
    if (request.signal.aborted) fail();
    else request.signal.addEventListener("abort", fail, { once: true });
  });
  const generated = provider.generate({
    ...request,
    onToken: (d) => {
      const prose = filter.push(d);
      if (prose) queue.push(prose);
      wake?.();
    },
  });
  const result = Promise.race([generated, aborted]).finally(() => {
    settled = true;
    wake?.();
  });
  // rethrown below; the losers of the race may settle later (a timeout after success, a late provider error)
  for (const p of [result, generated, aborted]) p.catch(() => {});
  while (!settled || queue.length) {
    if (queue.length) {
      yield queue.splice(0).join("");
      continue;
    }
    await new Promise<void>((r) => (wake = r));
    wake = null;
  }
  const rest = filter.flush();
  if (rest) yield rest;
  return result;
}

/**
 * The nudge after a step's tool calls. Not shown in the chat: it only lives in this run's prompt. Small models copy
 * phrases from it, so it names no outcome ("done", "opened") they could parrot as if it had happened.
 */
export const continuePrompt = (query: string): string =>
  `Next step for my request "${query.slice(0, 200)}": the next tool call, or one short sentence about the tool results if nothing is left. Don't repeat a call that worked.`;

/** After a failed call answered with prose: the failure, and what to do instead. */
export const failedPrompt = (error: string): string =>
  `That tool call failed: ${error} Fix it with a different tool call (search first if you don't know the exact name), or tell me plainly that it failed. Don't say it worked.`;

const clip = (s: string | null | undefined, max = 80): string | undefined => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? (t.length > max ? `${t.slice(0, max - 1)}…` : t) : undefined;
};
/** The page's title and main heading (skipping the chat's own UI). */
function pageSummary(): { title?: string; heading?: string } {
  if (typeof document === "undefined") return {};
  const h1 = [...document.querySelectorAll("main h1, h1")].find((h) => !h.closest("[data-web-agents-ui]"));
  return { title: clip(document.title), heading: clip(h1?.textContent) };
}

/** Run one user message through `provider`: an AgentAdapter `run()` body. */
export async function* runLocalAgent(
  provider: LocalProvider,
  req: AgentRunRequest,
  opts: LocalLoopOptions = {},
): AsyncGenerator<AgentStreamPart> {
  const { maxSteps = 6, stepTimeoutMs = 60_000, maxTools = 8, toolsInline = false } = opts;
  const query = lastUserText(req.messages);
  const format = provider.callFormat ?? "tags";
  const turns: ChatTurn[] = toChatTemplateMessages(req.messages, format);
  const used: string[] = [];
  let lastCall = "";
  let repeats = 0;
  /** The last tool call's error, until a later call succeeds: a reply that ignores it isn't accepted as the answer. */
  let failure: string | null = null;
  const path = typeof location === "undefined" ? undefined : location.pathname;
  const page = pageSummary();

  for (let step = 1; step <= maxSteps; step++) {
    if (req.signal.aborted) return yield { type: "finish", reason: "aborted" };
    // ---------- 0. the prompt: the page's tools fresh each step, as many as the model's window takes ----------
    let tools: CompactTool[] = [];
    let system = "";
    let fitted = false;
    for (const max of [...new Set([maxTools, 4, 2, 1])].filter((n) => n <= maxTools)) {
      tools = rankTools(req.tools, query, { max, recent: used.slice(-2) });
      system = buildLocalSystemPrompt({ path, page, tools, toolsInline: toolsInline ? tools : undefined, firstTool: tools[0], format });
      if (!provider.fits || (await provider.fits({ system, messages: turns, tools }).catch(() => true))) {
        fitted = true;
        break;
      }
    }
    // still too long: drop the oldest turns (the newest user turn always stays)
    while (!fitted && provider.fits) {
      const from = turns.findIndex((t, i) => i > 0 && t.role === "user");
      if (from === -1) break;
      turns.splice(0, from);
      fitted = await provider.fits({ system, messages: turns, tools }).catch(() => true);
    }
    if (!fitted) return yield { type: "error", error: TOO_LONG };
    const names = new Set(tools.map((t) => t.name));
    const messageId = newId();
    yield { type: "message-start", messageId };

    // ---------- 1. generate, with one retry for a malformed call ----------
    let calls: ParsedCall[] = [];
    let shown = ""; // the prose this step has shown so far
    // after a failed call, hold the first attempt's prose: it may claim the failed action worked
    const quiet = failure !== null;
    for (let attempt = 1; ; attempt++) {
      const signal = AbortSignal.any([req.signal, AbortSignal.timeout(stepTimeoutMs)]);
      let raw: GenerateResult;
      let streamed = "";
      try {
        const it = streamProse(provider, {
          system,
          messages: turns,
          tools,
          signal,
        });
        for (;;) {
          const next = await it.next();
          if (next.done) {
            raw = next.value;
            break;
          }
          streamed += next.value;
          // a retry's prose usually repeats the first attempt's: hold it back (shown below only if it's new)
          if (attempt === 1 && !quiet) yield { type: "text-delta", messageId, delta: next.value };
        }
      } catch (err) {
        if (req.signal.aborted) return yield { type: "finish", reason: "aborted" };
        if (signal.aborted) return yield { type: "error", error: TIMEOUT };
        return yield { type: "error", error: `The on-device model failed: ${err instanceof Error ? err.message : String(err)}` };
      }

      const parsed = parseToolCalls(raw.text, names);
      for (const c of parsed.calls) {
        const problem = validateArgs(tools.find((t) => t.name === c.name)!.parameters, c.arguments);
        if (problem) parsed.errors.push(`${c.name}: ${problem}`);
      }
      // a plain answer right after a failed call: send it back once with the failure, rather than show it
      if (failure && attempt === 1 && parsed.calls.length === 0 && parsed.errors.length === 0) {
        turns.push({ role: "assistant", content: raw.text }, { role: "user", content: failedPrompt(failure) });
        continue;
      }
      // prose not streamed: a provider that doesn't stream, a held-back first attempt, or a retry that says something new
      const prose = parsed.text.trim();
      if (prose && (attempt === 1 ? quiet || !streamed : prose !== shown.trim()))
        yield { type: "text-delta", messageId, delta: (shown ? "\n\n" : "") + prose };
      if (attempt === 1) shown = (quiet ? "" : streamed) || prose;
      else if (prose && !shown) shown = prose;
      turns.push({ role: "assistant", content: raw.text });
      if (parsed.errors.length === 0) {
        calls = parsed.calls;
        break;
      }
      if (attempt === 2) {
        yield { type: "text-delta", messageId, delta: (shown ? "\n\n" : "") + APOLOGY };
        return yield { type: "finish", reason: "stop" };
      }
      // feed the problem back once, as the tool's error
      turns.push({ role: "tool", name: parsed.calls[0]?.name ?? "tool", content: `Error: ${parsed.errors.join(" ")} Try again.` });
    }
    if (calls.length === 0) return yield { type: "finish", reason: "stop" };

    // ---------- 2. run the calls on the page, in order ----------
    for (const call of calls) {
      const key = JSON.stringify(call);
      repeats = key === lastCall ? repeats + 1 : 0;
      lastCall = key;
      if (repeats >= 2) {
        yield { type: "text-delta", messageId, delta: REPEAT };
        return yield { type: "finish", reason: "stop" };
      }
      const id = newId();
      yield { type: "tool-call", messageId, id, name: call.name, input: call.arguments };
      const output = await req.callTool({ id, name: call.name, input: call.arguments });
      used.push(call.name);
      turns.push({ role: "tool", name: call.name, content: textOf(output).slice(0, 1500) });
      failure = output.isError ? textOf(output).slice(0, 300) : null;
      yield output.isError ? { type: "tool-error", id, error: textOf(output) } : { type: "tool-result", id, output };
      if (req.signal.aborted) return yield { type: "finish", reason: "aborted" };
    }
    // small models echo the last tool answer and stop: restate the request, as the user, so the next step continues it
    turns.push({ role: "user", content: continuePrompt(query) });
    yield { type: "step-finish", step };
  }
  yield { type: "finish", reason: "max-steps" };
}
