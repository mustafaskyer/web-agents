/**
 * Request counting for the public demos. Upstash Redis (sliding window over
 * REST, so it works across serverless instances) when the Marketplace
 * integration's env is present; otherwise an in-memory window per instance,
 * which keeps local dev and unconfigured previews working.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** One check: may this key make another request? `reset` is when the window frees up (epoch ms). */
export interface LimitResult {
  /** The request may go ahead. */
  success: boolean;
  /** When the window frees up, epoch ms. */
  reset: number;
  remaining: number;
  /** Refused because storage failed (fail-closed), not because the limit was reached. */
  degraded?: boolean;
}

/** Counts requests per key; never rejects (a storage failure follows the limiter's fail-open/closed policy). */
export interface Limiter {
  limit(key: string): Promise<LimitResult>;
}

/** Environment variables, as `process.env` has them. */
export type Env = Record<string, string | undefined>;

/** Options for `createLimiter`. */
export interface LimiterOptions {
  /** Where the Upstash credentials are read (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`). */
  env: Env;
  /** Namespaces the keys, e.g. "playground:burst". */
  prefix: string;
  /** Requests per window. */
  limit: number;
  /** Window length: `"1 m"`, `"1 d"`. */
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  /**
   * When Redis doesn't answer within 1 s: let the request through (`true`, per-IP limits: an outage must not take the
   * chat down) or refuse it (`false`, the global budget: an outage must not turn into an unbounded bill).
   */
  failOpen: boolean;
  /** Tests: a stand-in for `new Ratelimit(...)`. */
  createRatelimit?: (config: ConstructorParameters<typeof Ratelimit>[0]) => Pick<Ratelimit, "limit">;
}

const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const windowMs = (w: LimiterOptions["window"]): number => {
  const [n, unit] = w.split(" ") as [string, keyof typeof UNIT_MS];
  return Number(n) * UNIT_MS[unit];
};

/** The Upstash REST credentials, from either env naming (Vercel Marketplace `KV_*`, or Upstash's own). */
export function redisCredentials(env: Env): { url: string; token: string } | null {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

let warned = false;
/** One Redis client per credentials: every limiter of a function instance shares it. */
const clients = new Map<string, Redis>();

/** A sliding-window limiter: Upstash when configured, in-memory otherwise. */
export function createLimiter(opts: LimiterOptions): Limiter {
  const credentials = redisCredentials(opts.env);
  if (credentials) {
    const create = opts.createRatelimit ?? ((config) => new Ratelimit(config));
    const ratelimit = create({
      redis: clients.get(credentials.url) ?? clients.set(credentials.url, new Redis(credentials)).get(credentials.url)!,
      limiter: Ratelimit.slidingWindow(opts.limit, opts.window),
      prefix: `web-agents:${opts.prefix}`,
      analytics: false,
      timeout: 1_000,
    });
    const failed = (): LimitResult =>
      opts.failOpen
        ? { success: true, reset: Date.now(), remaining: 0 }
        : { success: false, reset: Date.now() + 60_000, remaining: 0, degraded: true };
    return {
      async limit(key) {
        try {
          const r = await ratelimit.limit(key);
          // Upstash lets a timed-out request through: keep that only where failing open is the policy
          return r.reason === "timeout" ? failed() : { success: r.success, reset: r.reset, remaining: r.remaining };
        } catch (err) {
          console.error("[web-agents/vercel-api] rate limit storage failed:", err);
          return failed(); // a bad token or an outage: the same policy as a timeout
        }
      },
    };
  }

  if (!warned) {
    warned = true;
    console.warn("[web-agents/vercel-api] Rate limiting is per-instance. Add Upstash Redis for global limits.");
  }
  return createMemoryLimiter(opts.limit, windowMs(opts.window));
}

const MAX_KEYS = 10_000;

/** In-memory sliding window: request timestamps per key, pruned on each call; the oldest keys go first past 10k. */
export function createMemoryLimiter(limit: number, windowMs: number, now = () => Date.now()): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async limit(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => at > t - windowMs);
      const success = recent.length < limit;
      if (success) recent.push(t);
      hits.delete(key); // re-insert: Map order doubles as recency
      hits.set(key, recent);
      if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value!);
      return { success, reset: (recent[0] ?? t) + windowMs, remaining: Math.max(0, limit - recent.length) };
    },
  };
}
