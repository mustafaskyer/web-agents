/**
 * `/api/chat` as a web-standard function: `(req: Request) => Promise<Response>`,
 * so it runs on Vercel, in any Node/edge server, and in `vite dev` (see ../vite).
 *
 * The page's tools arrive with every request and are declared without
 * `execute`: the model's tool calls stream back to the browser, which runs them
 * on the live page (cursor and all) and posts the results in the next request.
 * One request = one model step.
 */
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  InvalidToolInputError,
  isStepCount,
  jsonSchema,
  type LanguageModel,
  NoSuchToolError,
  streamText,
  type ToolSet,
  toUIMessageStream,
} from "ai";
import { toUIMessages } from "../adapter/wire";
import type { AgentMessage } from "../types";
import { buildSystemPrompt, DEFAULT_SYSTEM_PROMPT } from "./system-prompt";
import {
  type ChatRequest,
  chatRequestSchema,
  cleanText,
  isCrossSite,
  LIMITS,
  readCappedText,
  samePagePath,
  sanitizeSchema,
} from "./validate";

/** Claude Opus 5.5: the roadmap's default. Override with WEB_AGENTS_MODEL (e.g. claude-sonnet-5-5 for a public demo). */
export const DEFAULT_MODEL = "claude-opus-5-5";

/** Claude's effort levels: how much the model thinks per step. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ChatHandlerOptions {
  /** A LanguageModel instance, or a Claude model id for @ai-sdk/anthropic. Default: env WEB_AGENTS_MODEL ?? "claude-opus-5-5". */
  model?: LanguageModel | string;
  /** System prompt. Default `DEFAULT_SYSTEM_PROMPT` (acting on a live page, confirmations, short replies). */
  system?: string;
  /**
   * Output token cap per step. Claude's thinking counts against it, so keep room
   * beyond the visible reply. Default 8192.
   */
  maxOutputTokens?: number;
  /** Claude effort (model ids only): how hard the model thinks per step. Default "low": a chat about the page should feel quick. */
  effort?: Effort;
  /** Tool steps per user turn; the request after the last one gets no tools, so the model sums up. Default 8 (the cloud adapter's default too). */
  maxSteps?: number;
  /**
   * Runs first; return a Response to short-circuit. A public deployment needs one: rate limits per IP/session, a
   * token budget. Cross-site browser requests are already refused.
   */
  guard?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  /**
   * Runs after the request is validated and chat is known to be enabled, right before the model call: count budgets
   * here, so malformed or refused requests never use them up. Return a Response to refuse.
   */
  beforeModel?: (req: Request) => Promise<Response | undefined> | Response | undefined;
  /** Where ANTHROPIC_API_KEY and WEB_AGENTS_MODEL come from. Default `process.env`. */
  env?: Record<string, string | undefined>;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Assistant messages with tool calls since the last user message: the steps this turn has taken. */
function stepsThisTurn(messages: ChatRequest["messages"]): number {
  let steps = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role === "user") break;
    if (m.parts.some((p) => p.type === "tool")) steps++;
  }
  return steps;
}

async function readBody(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    // also makes a cross-site browser POST a preflighted request
    return { ok: false, response: json({ error: "bad_request", message: "Send JSON (content-type: application/json)" }, 415) };
  }
  const text = await readCappedText(req, LIMITS.bodyBytes);
  if (text === null) return { ok: false, response: json({ error: "bad_request", message: "Request body too large" }, 413) };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: json({ error: "bad_request", message: "Body is not JSON" }, 400) };
  }
}

/** Create the `/api/chat` handler. GET reports whether chat is configured; POST runs one model step. */
export function createChatHandler(opts: ChatHandlerOptions = {}): (req: Request) => Promise<Response> {
  const env = opts.env ?? (typeof process === "undefined" ? {} : process.env);
  const modelId = typeof opts.model === "string" ? opts.model : (env.WEB_AGENTS_MODEL ?? DEFAULT_MODEL);
  const instance = typeof opts.model === "object" ? opts.model : undefined;
  const enabled = (): boolean => !!instance || !!env.ANTHROPIC_API_KEY;
  const maxSteps = opts.maxSteps ?? 8;

  let model: Promise<LanguageModel> | undefined;
  const resolveModel = (): Promise<LanguageModel> => {
    if (instance) return Promise.resolve(instance);
    // Only here: a handler built with a model instance (tests, other providers) never loads the Anthropic SDK.
    model ??= import("@ai-sdk/anthropic").then(({ createAnthropic }) => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(modelId));
    return model;
  };

  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method !== "GET" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    if (isCrossSite(req)) return json({ error: "forbidden", message: "Cross-site requests are not allowed." }, 403);
    const blocked = await opts.guard?.(req);
    if (blocked) return blocked;
    if (req.method === "GET") return json({ enabled: enabled(), model: instance ? (instance.modelId ?? "custom") : modelId });

    if (!enabled()) return json({ error: "chat_disabled", message: "ANTHROPIC_API_KEY is not set on the server." }, 503);
    const body = await readBody(req);
    if (!body.ok) return body.response;
    const parsed = chatRequestSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "bad_request", issues: parsed.error.issues.slice(0, 10) }, 400);
    const { messages, tools: pageTools, page } = parsed.data;
    const refused = await opts.beforeModel?.(req);
    if (refused) return refused;

    const budgetSpent = stepsThisTurn(messages) >= maxSteps;
    const tools: ToolSet = budgetSpent
      ? {}
      : Object.fromEntries(
          pageTools.map((t) => [t.name, { description: cleanText(t.description), inputSchema: jsonSchema(sanitizeSchema(t.inputSchema)) }]),
        );
    let system = buildSystemPrompt(opts.system ?? DEFAULT_SYSTEM_PROMPT, samePagePath(page?.url, req.headers.get("origin")));
    if (budgetSpent) system += "\n\nTool budget for this request reached: summarize what was done and what is left, without calling tools.";

    try {
      const result = streamText({
        model: await resolveModel(),
        system,
        messages: await convertToModelMessages(toUIMessages(messages as AgentMessage[])),
        tools,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        abortSignal: req.signal,
        stopWhen: isStepCount(1),
        // Claude Opus 5.5 always thinks; effort sets how much. "default" fallbacks re-run a declined request on another model.
        providerOptions: instance ? undefined : { anthropic: { effort: opts.effort ?? "low", fallbacks: "default" } },
      });
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          sendReasoning: true,
          onError: (err) => {
            // A bad tool call goes back to the model as that call's error: say exactly what was wrong.
            if (NoSuchToolError.isInstance(err)) return `Error: Tool "${err.toolName}" is not available on this page right now.`;
            if (InvalidToolInputError.isInstance(err)) return `Error: Invalid input for "${err.toolName}": ${err.message}`;
            console.error("[web-agents/chat] model error:", err);
            return "The assistant had a problem answering. Try again.";
          },
        }),
      });
    } catch (err) {
      console.error("[web-agents/chat] request failed:", err);
      return json({ error: "server_error", message: "The assistant had a problem answering. Try again." }, 500);
    }
  };
}
