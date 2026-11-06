import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import {
  budgetGuard,
  clientIp,
  createLimiter,
  createMemoryLimiter,
  createVercelChatRoute,
  originGuard,
  rateLimitGuard,
} from "../src/index";

const post = (headers: Record<string, string> = {}, body = "{}") =>
  new Request("https://demo.example/api/chat", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
const get = (headers: Record<string, string> = {}) => new Request("https://demo.example/api/chat", { headers });

describe("originGuard", () => {
  it("POST needs this deployment's own Origin (any host it's served on); GET needs nothing", async () => {
    const guard = originGuard();
    expect(await guard(post({ origin: "https://demo.example" }))).toBeUndefined();
    const custom = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: "{}",
    });
    expect(await guard(custom)).toBeUndefined(); // vercel dev, custom domains: the request's own origin
    const refused = await guard(post({ origin: "https://evil.example" }));
    expect(refused?.status).toBe(403);
    expect(await refused?.json()).toEqual({ error: "forbidden_origin" });
    expect((await guard(post()))?.status).toBe(403);
    expect(await guard(get())).toBeUndefined();
  });
});

describe("rateLimitGuard", () => {
  it("the 11th POST in a minute from one IP gets 429 with retry-after; other IPs and GETs are unaffected", async () => {
    const guard = rateLimitGuard(createMemoryLimiter(10, 60_000));
    const from = (ip: string) => post({ "x-forwarded-for": `${ip}, 10.0.0.1` });
    for (let i = 0; i < 10; i++) expect(await guard(from("1.1.1.1"))).toBeUndefined();
    const limited = await guard(from("1.1.1.1"));
    expect(limited?.status).toBe(429);
    expect(await limited?.json()).toEqual({ error: "rate_limited" });
    expect(Number(limited?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await guard(from("2.2.2.2"))).toBeUndefined();
    expect(await guard(get({ "x-forwarded-for": "1.1.1.1" }))).toBeUndefined();
  });

  it("a refused daily window answers with the longer wait", async () => {
    const guard = rateLimitGuard(createMemoryLimiter(5, 60_000), createMemoryLimiter(1, 86_400_000));
    await guard(post({ "x-real-ip": "7.7.7.7" }));
    const limited = await guard(post({ "x-real-ip": "7.7.7.7" }));
    expect(Number(limited?.headers.get("retry-after"))).toBeGreaterThan(3600);
  });

  it("reads the client IP from x-forwarded-for, then x-real-ip", () => {
    expect(clientIp(post({ "x-forwarded-for": " 3.3.3.3 , 4.4.4.4" }))).toBe("3.3.3.3");
    expect(clientIp(post({ "x-real-ip": "5.5.5.5" }))).toBe("5.5.5.5");
    expect(clientIp(post())).toBe("anon");
  });

  it("the memory window slides", async () => {
    let t = 0;
    const limiter = createMemoryLimiter(1, 1_000, () => t);
    expect((await limiter.limit("k")).success).toBe(true);
    expect((await limiter.limit("k")).success).toBe(false);
    t = 1_001;
    expect((await limiter.limit("k")).success).toBe(true);
  });
});

describe("budgetGuard", () => {
  it("past the daily budget, the chat reads as offline (503 chat_disabled)", async () => {
    const guard = budgetGuard(createMemoryLimiter(2, 86_400_000));
    expect(await guard(post())).toBeUndefined();
    expect(await guard(post())).toBeUndefined();
    const over = await guard(post());
    expect(over?.status).toBe(503);
    expect(await over?.json()).toEqual({ error: "unavailable", reason: "daily_budget" });
  });
});

describe("Upstash limiter", () => {
  const env = { KV_REST_API_URL: "https://redis.example", KV_REST_API_TOKEN: "t" };
  const timingOut = () => ({
    limit: vi.fn(async () => ({ success: true, reason: "timeout" as const, reset: 0, remaining: 0, limit: 1, pending: Promise.resolve() })),
  });

  it("a timeout fails open for per-IP limits and closed for the budget", async () => {
    const perIp = createLimiter({ env, prefix: "p", limit: 10, window: "1 m", failOpen: true, createRatelimit: timingOut });
    const budget = createLimiter({ env, prefix: "g", limit: 10, window: "1 d", failOpen: false, createRatelimit: timingOut });
    expect((await perIp.limit("1.1.1.1")).success).toBe(true);
    expect((await budget.limit("global")).success).toBe(false);
  });

  it("a storage error also follows the policy (no 500s)", async () => {
    const throwing = () => ({
      limit: vi.fn(async () => {
        throw new Error("WRONGPASS");
      }),
    });
    const perIp = createLimiter({ env, prefix: "p2", limit: 10, window: "1 m", failOpen: true, createRatelimit: throwing as never });
    const budget = createLimiter({ env, prefix: "g2", limit: 10, window: "1 d", failOpen: false, createRatelimit: throwing as never });
    expect((await perIp.limit("ip")).success).toBe(true);
    expect(await budget.limit("global")).toMatchObject({ success: false, degraded: true });
    const r = await budgetGuard(budget)(post());
    expect(await r?.json()).toEqual({ error: "unavailable", reason: "busy" });
  });

  it("is used with either env naming", async () => {
    const create = vi.fn(() => ({ limit: async () => ({ success: true, reset: 0, remaining: 9, limit: 10, pending: Promise.resolve() }) }));
    createLimiter({
      env: { UPSTASH_REDIS_REST_URL: "https://redis-2.example", UPSTASH_REDIS_REST_TOKEN: "t" },
      prefix: "x",
      limit: 1,
      window: "1 m",
      failOpen: true,
      createRatelimit: create,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ prefix: "web-agents:x", analytics: false, timeout: 1000 }));
  });
});

describe("createVercelChatRoute", () => {
  it("malformed requests don't use up the global budget", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: convertArrayToReadableStream([
          { type: "stream-start", warnings: [] },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 0, text: 0, reasoning: 0 },
            },
          },
        ]),
      }),
    });
    const route = createVercelChatRoute({ app: "budget", env: { RATE_LIMIT_GLOBAL_DAILY: "1" }, model });
    for (let i = 0; i < 3; i++) expect((await route.POST(post({ origin: "https://demo.example" }, "{}"))).status).toBe(400);
    const body = JSON.stringify({ messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] });
    // the first valid request still has the whole budget
    const first = await route.POST(post({ origin: "https://demo.example" }, body));
    expect(first.status).toBe(200);
    await first.text();
    expect(await (await route.POST(post({ origin: "https://demo.example" }, body))).json()).toEqual({
      error: "unavailable",
      reason: "daily_budget",
    });
  });

  it("without a key: GET says offline, a same-origin POST gets 503; a foreign origin 403", async () => {
    const route = createVercelChatRoute({ app: "test", env: { VERCEL_ENV: "preview" } });
    expect(await (await route.GET(get())).json()).toEqual({ enabled: false, model: "claude-sonnet-5-5" });
    const body = JSON.stringify({ messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "hi" }] }], tools: [] });
    expect((await route.POST(post({ origin: "https://demo.example" }, body))).status).toBe(503);
    expect((await route.POST(post({ origin: "https://evil.example" }, body))).status).toBe(403);
  });
});
