import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileHeaders } from "../src/adapter/turnstile";

type Params = Record<string, (arg?: string) => void> & { sitekey: string; action: string; appearance: string };

/** A stand-in for Cloudflare's `window.turnstile` (no network in tests): `answer` plays the widget's part. */
function fakeTurnstile(answer: (params: Params, host: HTMLElement) => void) {
  const api = {
    render: vi.fn((host: HTMLElement, params: Params) => {
      setTimeout(() => answer(params, host), 10);
      return "w1";
    }),
    remove: vi.fn(),
  };
  (window as { turnstile?: unknown }).turnstile = api;
  return api;
}

afterEach(() => {
  delete (window as { turnstile?: unknown }).turnstile;
});

describe("turnstileHeaders", () => {
  it("renders an interaction-only widget in a library-UI host, resolves to the token header, then cleans up", async () => {
    let host: HTMLElement | undefined;
    const api = fakeTurnstile((params, el) => {
      host = el;
      expect(document.body.contains(el)).toBe(true);
      params.callback!("tok-123");
    });
    const headers = await turnstileHeaders({ siteKey: "1x00000000000000000000AA" })();
    expect(headers).toEqual({ "x-turnstile-token": "tok-123" });
    expect(api.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ sitekey: "1x00000000000000000000AA", action: "web_agents_chat", appearance: "interaction-only" }),
    );
    expect(host!.getAttribute("data-web-agents-ui")).toBe("turnstile");
    expect(api.remove).toHaveBeenCalledWith("w1");
    expect(document.body.contains(host!)).toBe(false);
  });

  it("each call is a fresh challenge (tokens are single-use)", async () => {
    let n = 0;
    const api = fakeTurnstile((params) => params.callback!(`tok-${++n}`));
    const get = turnstileHeaders({ siteKey: "k", header: "x-bot-check" });
    expect(await get()).toEqual({ "x-bot-check": "tok-1" });
    expect(await get()).toEqual({ "x-bot-check": "tok-2" });
    expect(api.render).toHaveBeenCalledTimes(2);
  });

  it("rejects on a widget error or no token in time, and still removes the widget", async () => {
    const api = fakeTurnstile((params) => params["error-callback"]!());
    await expect(turnstileHeaders({ siteKey: "k" })()).rejects.toThrow("Turnstile: the challenge failed.");
    expect(api.remove).toHaveBeenCalledTimes(1);
    fakeTurnstile(() => {});
    await expect(turnstileHeaders({ siteKey: "k", timeout: 50 })()).rejects.toThrow("no token in time");
    expect(document.querySelector('[data-web-agents-ui="turnstile"]')).toBeNull();
  });
});
