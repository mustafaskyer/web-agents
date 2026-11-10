/**
 * @webmcp-agents/vercel-api (private): the examples' `/api/chat` as Vercel web handlers.
 *
 *   // apps/<app>/api/chat.ts
 *   export const { GET, POST, OPTIONS } = createVercelChatRoute({ app: "playground" });
 *
 * Env is read when the route is created (at the function's cold start), never at import time.
 */
import { createChatHandler, type WebAgent } from "@webmcp-agents/chat/server";
import type { LanguageModel } from "ai";
import { budgetGuard, composeGuards, originGuard, rateLimitGuard } from "./guards";
import { createLimiter, type Env } from "./limiter";

export type { Guard } from "./guards";
export { budgetGuard, clientIp, composeGuards, originGuard, rateLimitGuard } from "./guards";
export type { Env, Limiter, LimiterOptions, LimitResult } from "./limiter";
export { createLimiter, createMemoryLimiter, redisCredentials } from "./limiter";

/** Options for `createVercelChatRoute`. */
export interface VercelChatRouteOptions {
  /** Namespaces the rate-limit keys per app. */
  app: string;
  /** Default `process.env`. */
  env?: Env;
  /** A model instance, or a `"<provider>/<model>"` id, instead of `WEB_AGENTS_MODEL` (default `anthropic/claude-sonnet-5-5`). */
  model?: LanguageModel | string;
  /** The page's agents (`defineWebAgent`): the same list the page passes to `<AgentChat>`. */
  agents?: readonly WebAgent[];
}

const num = (value: string | undefined, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * The chat handler behind origin and per-IP guards, with a global daily budget on model calls. Public demos default to
 * Claude Sonnet 5.5 (cheaper, faster), 4096 output tokens (thinking counts against them) and 6 steps; every limit is
 * an env var (see docs/more/deploy.md).
 */
export function createVercelChatRoute({ app, env = process.env, model, agents }: VercelChatRouteOptions) {
  // each tool step is one request: a 6-step turn is 7, so a burst limit must fit a few turns
  const perMinute = num(env.RATE_LIMIT_PER_MINUTE, 30);
  const perDay = num(env.RATE_LIMIT_PER_DAY, 300);
  const globalDaily = num(env.RATE_LIMIT_GLOBAL_DAILY, 3000);
  const handler = createChatHandler({
    env,
    model: model ?? env.WEB_AGENTS_MODEL ?? "anthropic/claude-sonnet-5-5",
    agents,
    maxOutputTokens: num(env.WEB_AGENTS_MAX_OUTPUT_TOKENS, 4096),
    maxSteps: num(env.WEB_AGENTS_MAX_STEPS, 6),
    guard: composeGuards(
      originGuard(),
      rateLimitGuard(
        createLimiter({ env, prefix: `${app}:minute`, limit: perMinute, window: "1 m", failOpen: true }),
        createLimiter({ env, prefix: `${app}:day`, limit: perDay, window: "1 d", failOpen: true }),
      ),
    ),
    // after validation: malformed requests never use up the shared budget
    beforeModel: budgetGuard(createLimiter({ env, prefix: `${app}:global`, limit: globalDaily, window: "1 d", failOpen: false })),
  });
  return { GET: handler, POST: handler, OPTIONS: handler };
}
