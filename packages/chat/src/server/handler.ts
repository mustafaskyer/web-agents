/**
 * `/api/chat` as a web-standard function: `(req: Request) => Promise<Response>`,
 * so it runs on Vercel, in any Node/edge server, and in `vite dev` (see ../vite).
 *
 * The page's tools arrive with every request and are declared without
 * `execute`: the model's tool calls stream back to the browser, which runs them
 * on the live page (cursor and all) and posts the results in the next request.
 * One request = one model step, run by an AI SDK `ToolLoopAgent` built for the
 * request from the registered WebAgent (instructions, tool subset, sub-agents,
 * model), or from the plain assistant prompt when the page set no agent.
 */
import { createAgentUIStreamResponse, InvalidToolInputError, type LanguageModel, NoSuchToolError, ToolLoopAgent, type ToolSet } from "ai";
import { toUIMessages } from "../adapter/wire";
import { flattenWebAgents, type WebAgent } from "../agent";
import { notOnPage } from "../shared";
import type { AgentMessage } from "../types";
import { modelAvailability, ModelUnavailableError, parseModelId, providerOptionsFor, type ReasoningLevel, resolveModel } from "./models";
import { DEFAULT_SYSTEM_PROMPT } from "./system-prompt";
import { type ChatRequest, chatRequestSchema, isCrossSite, LIMITS, readCappedText, samePagePath } from "./validate";
import { toToolLoopAgentSettings, type WebAgentSettings } from "./web-agent";

/** Claude Opus 5.5 through its own SDK: the roadmap's default. Override with WEB_AGENTS_MODEL (e.g. anthropic/claude-sonnet-5-5). */
export const DEFAULT_MODEL = "anthropic/claude-opus-5-5";

/** @deprecated Anthropic-only effort levels; use `reasoning` ("off" | "low" | "medium" | "high"). */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ChatHandlerOptions {
  /**
   * A LanguageModel instance, or a `"<provider>/<model>"` id resolved with the provider's key from `env`
   * (`anthropic/…`, `openai/…`, `google/…`, `deepseek/…`, `xai/…`, `mistral/…`, `openrouter/<vendor>/<model>`, or
   * any `a/b` id through the AI Gateway). A bare `claude-…` id is Anthropic's. Default: env WEB_AGENTS_MODEL ?? `DEFAULT_MODEL`.
   */
  model?: LanguageModel | string;
  /** System prompt. Default `DEFAULT_SYSTEM_PROMPT` (acting on a live page, confirmations, short replies). */
  system?: string;
  /**
   * The agents the page may name (`defineWebAgent`), sub-agents included: their instructions, tool subsets and models
   * are read from here by id. A request naming an agent not in this list is refused (400).
   */
  agents?: readonly WebAgent[];
  /**
   * Output token cap per step. A thinking model's reasoning counts against it, so keep room
   * beyond the visible reply. Default 8192.
   */
  maxOutputTokens?: number;
  /** How hard the model thinks per step, for any provider that has the knob. Default "low": a chat about the page should feel quick. */
  reasoning?: ReasoningLevel;
  /** @deprecated Anthropic's effort levels (wins over `reasoning` when both are set, Anthropic only). */
  effort?: Effort;
  /** Tool steps per user turn; the request after the last one gets no tools, so the model sums up. Default 8 (the cloud adapter's default too). An agent's own `maxSteps` wins. */
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
  /**
   * Tune the AI SDK `ToolLoopAgent` the handler builds for each request (add `prepareStep`, telemetry, middleware…).
   * The settings carry the model, the instructions and the page's tools already applied; return what to use.
   */
  prepareAgent?: (settings: WebAgentSettings, context: { agent?: WebAgent; request: Request }) => WebAgentSettings;
  /** Where the provider keys and WEB_AGENTS_MODEL come from. Default `process.env`. */
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

const TOOL_BUDGET_NOTE = "Tool budget for this request reached: summarize what was done and what is left, without calling tools.";

/** Create the `/api/chat` handler. GET reports whether chat is configured; POST runs one model step. */
export function createChatHandler(opts: ChatHandlerOptions = {}): (req: Request) => Promise<Response> {
  const env = opts.env ?? (typeof process === "undefined" ? {} : process.env);
  const modelId = typeof opts.model === "string" ? opts.model : (env.WEB_AGENTS_MODEL ?? DEFAULT_MODEL);
  const instance = typeof opts.model === "object" ? opts.model : undefined;
  const registry = flattenWebAgents(opts.agents ?? []);
  const level: ReasoningLevel = opts.effort
    ? opts.effort === "xhigh" || opts.effort === "max"
      ? "high"
      : opts.effort
    : (opts.reasoning ?? "low");
  let warnedUnavailable = false;

  /** The default model's availability (an instance is always available). */
  const availability = () =>
    instance ? { enabled: true, provider: "custom", message: "", missingEnv: [], viaGateway: false } : modelAvailability(modelId, env);

  /** The model for a request: the agent's own id, else the handler's (an instance wins over ids). */
  const modelFor = async (agent: WebAgent | undefined): Promise<{ model: LanguageModel; provider: string; id: string }> => {
    if (instance && !agent?.model) return { model: instance, provider: "custom", id: instance.modelId ?? "custom" };
    const id = agent?.model ?? modelId;
    const resolved = await resolveModel(id, env);
    return { ...resolved, id };
  };

  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method !== "GET" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    if (isCrossSite(req)) return json({ error: "forbidden", message: "Cross-site requests are not allowed." }, 403);
    const blocked = await opts.guard?.(req);
    if (blocked) return blocked;
    const available = availability();
    if (req.method === "GET") {
      return json({
        enabled: available.enabled,
        model: instance ? (instance.modelId ?? "custom") : modelId,
        provider: available.provider,
        agents: [...registry.keys()],
      });
    }

    if (!available.enabled) {
      if (!warnedUnavailable) {
        warnedUnavailable = true;
        console.warn(`[web-agents/chat] chat is disabled: ${available.message}`);
      }
      return json({ error: "chat_disabled", message: available.message }, 503);
    }
    const body = await readBody(req);
    if (!body.ok) return body.response;
    const parsed = chatRequestSchema.safeParse(body.value);
    if (!parsed.success) return json({ error: "bad_request", issues: parsed.error.issues.slice(0, 10) }, 400);
    const { messages, tools: pageTools, page } = parsed.data;
    const agent = parsed.data.agent ? registry.get(parsed.data.agent) : undefined;
    if (parsed.data.agent && !agent) {
      return json(
        { error: "bad_request", message: `Unknown agent "${parsed.data.agent}": register it with createChatHandler({ agents }).` },
        400,
      );
    }
    const refused = await opts.beforeModel?.(req);
    if (refused) return refused;

    const maxSteps = agent?.maxSteps ?? opts.maxSteps ?? 8;
    const budgetSpent = stepsThisTurn(messages) >= maxSteps;

    try {
      const { model, provider, id } = await modelFor(agent);
      let settings = toToolLoopAgentSettings(agent, {
        model,
        tools: pageTools,
        path: samePagePath(page?.url, req.headers.get("origin")),
        base: opts.system ?? DEFAULT_SYSTEM_PROMPT,
        extraInstructions: budgetSpent ? TOOL_BUDGET_NOTE : undefined,
        toolSet: budgetSpent ? {} : undefined,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        providerOptions: provider === "custom" ? undefined : providerOptionsFor(provider, level, parseModelId(id).id),
      });
      if (opts.prepareAgent) settings = opts.prepareAgent(settings, { agent, request: req });
      const loop = new ToolLoopAgent<never, ToolSet>(settings);
      return await createAgentUIStreamResponse({
        agent: loop,
        uiMessages: toUIMessages(messages as AgentMessage[]),
        abortSignal: req.signal,
        sendReasoning: true,
        onError: (err) => {
          // A bad tool call goes back to the model as that call's error: say exactly what was wrong.
          if (NoSuchToolError.isInstance(err)) return notOnPage(err.toolName);
          if (InvalidToolInputError.isInstance(err)) return `Error [invalid_input]: Invalid input for "${err.toolName}": ${err.message}`;
          console.error("[web-agents/chat] model error:", err);
          return "The assistant had a problem answering. Try again.";
        },
      });
    } catch (err) {
      if (err instanceof ModelUnavailableError) {
        console.error(`[web-agents/chat] ${err.message}`);
        return json({ error: "chat_disabled", message: err.message }, 503);
      }
      console.error("[web-agents/chat] request failed:", err);
      return json({ error: "server_error", message: "The assistant had a problem answering. Try again." }, 500);
    }
  };
}
