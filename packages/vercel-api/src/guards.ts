/**
 * Guards for a public /api/chat: they run before the model (ChatHandlerOptions.guard) and answer with the statuses
 * the chat widget already explains (403, 429 `rate_limited`, 503 `chat_disabled`). Only POST is limited: GET is the
 * capability check, and OPTIONS a preflight.
 */
import type { Limiter } from "./limiter";

/** Returns a Response to refuse the request, or undefined to let it through. */
export type Guard = (req: Request) => Promise<Response | undefined> | Response | undefined;

const json = (body: unknown, status: number, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

/** Run guards in order; the first refusal wins. */
export const composeGuards =
  (...guards: Guard[]): Guard =>
  async (req) => {
    for (const guard of guards) {
      const refused = await guard(req);
      if (refused) return refused;
    }
    return undefined;
  };

/**
 * POST must carry this deployment's own Origin (browsers always send it). The chat handler already refuses a
 * different Origin; this adds "no Origin, no chat", which stops casual scripts. Not real protection on its own (any
 * script can send a fake Origin): the rate limits and the budget are.
 */
export function originGuard(): Guard {
  return (req) => {
    if (req.method !== "POST") return undefined;
    const origin = req.headers.get("origin");
    return origin && origin === new URL(req.url).origin ? undefined : json({ error: "forbidden_origin" }, 403);
  };
}

/** The client's IP: first `x-forwarded-for` entry (set by Vercel's proxy), else `x-real-ip`, else one shared bucket. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "anon";
}

/** Per-IP limits (each tool step is one POST, so a burst limit must leave room for a 4–5 step turn). */
export function rateLimitGuard(...limiters: Limiter[]): Guard {
  return async (req) => {
    if (req.method !== "POST") return undefined;
    const ip = clientIp(req);
    const results = await Promise.all(limiters.map((l) => l.limit(ip)));
    // the longest wait wins: a refused daily window reads as "tomorrow", not "in a minute"
    const refused = results.filter((r) => !r.success).sort((a, b) => b.reset - a.reset)[0];
    if (!refused) return undefined;
    const seconds = Math.max(1, Math.ceil((refused.reset - Date.now()) / 1000));
    return json({ error: "rate_limited" }, 429, { "retry-after": String(seconds) });
  };
}

/**
 * A daily cap on model calls across all visitors. Use it as the handler's `beforeModel` hook, so only validated
 * requests that reach the model count. Past the cap: 503 `daily_budget`; storage down (fail-closed): 503 `busy`.
 */
export function budgetGuard(limiter: Limiter): Guard {
  return async (req) => {
    if (req.method !== "POST") return undefined;
    const r = await limiter.limit("global");
    if (r.success) return undefined;
    return json({ error: "unavailable", reason: r.degraded ? "busy" : "daily_budget" }, 503);
  };
}

/**
 * A per-session request limit, for `beforeModel` (the session id comes from the handler's context). 429
 * `rate_limited` once a session used its requests: the page has to start a new session, which `verify` can gate.
 */
export async function sessionGuard(limiter: Limiter, session: string): Promise<Response | undefined> {
  const r = await limiter.limit(session);
  if (r.success) return undefined;
  const seconds = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return json({ error: "rate_limited" }, 429, { "retry-after": String(seconds) });
}

/** Chat off until the deployment has a session secret: GET says disabled, POST gets 503 `chat_disabled`. */
export const secretMissingGuard: Guard = (req) =>
  req.method === "GET"
    ? json({ enabled: false }, 200)
    : json({ error: "chat_disabled", message: "Set WEB_AGENTS_SESSION_SECRET on the server." }, 503);
