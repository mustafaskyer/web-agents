import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { webAgentsChatDev } from "../src/vite";

let server: ViteDevServer;
let base: string;

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: mkdtempSync(join(tmpdir(), "wa-chat-")),
    logLevel: "silent",
    server: { port: 0 },
    plugins: [
      webAgentsChatDev({
        handler: async (req) => {
          const url = new URL(req.url);
          if (url.searchParams.has("stream")) {
            const enc = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(c) {
                  c.enqueue(enc.encode("data: one\n\n"));
                  c.enqueue(enc.encode("data: two\n\n"));
                  c.close();
                },
              }),
              { headers: { "content-type": "text/event-stream" } },
            );
          }
          return Response.json({ method: req.method, path: url.pathname, body: req.method === "POST" ? await req.text() : null });
        },
      }),
    ],
  });
  await server.listen();
  base = `http://localhost:${(server.httpServer!.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

describe("webAgentsChatDev", () => {
  it("passes requests to the handler with the full path and body", async () => {
    const res = await fetch(`${base}/api/chat`, { method: "POST", body: '{"hi":1}' });
    expect(await res.json()).toEqual({ method: "POST", path: "/api/chat", body: '{"hi":1}' });
    expect(await (await fetch(`${base}/api/chat`)).json()).toMatchObject({ method: "GET", path: "/api/chat" });
  });

  it("streams the response body through", async () => {
    const res = await fetch(`${base}/api/chat?stream`);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(await res.text()).toBe("data: one\n\ndata: two\n\n");
  });

  it("leaves other paths to Vite", async () => {
    expect((await fetch(`${base}/api/chat-other`)).status).toBe(404);
    expect((await fetch(`${base}/api/other`)).status).toBe(404);
  });
});
