/**
 * @web-agents/chat/vite: serve `/api/chat` from `vite dev`, so the widget works
 * locally without a separate server. The API key is read from `.env` files
 * server-side (never a VITE_-prefixed variable: those are shipped to the browser).
 *
 *   plugins: [react(), webAgentsChatDev()]                     // ANTHROPIC_API_KEY in .env.local
 */
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { createChatHandler } from "../server/handler";
import { sendWebResponse, toWebRequest } from "./node-bridge";

/** Options for `webAgentsChatDev`. */
export interface WebAgentsChatDevOptions {
  /** Mount path. Default "/api/chat". */
  path?: string;
  /** The handler to serve. Default `createChatHandler({ env })` with the env read from the project's .env files. */
  handler?: (req: Request) => Promise<Response>;
}

const ENV_KEYS = ["ANTHROPIC_API_KEY", "WEB_AGENTS_MODEL"] as const;

/** A Vite plugin that serves the chat endpoint during `vite dev` (`apply: "serve"`: nothing in builds). */
export function webAgentsChatDev({ path = "/api/chat", handler }: WebAgentsChatDevOptions = {}): Plugin {
  let serve = handler;
  return {
    name: "web-agents-chat-dev",
    apply: "serve",
    configResolved(config) {
      if (serve) return;
      // "" prefix: load every variable, then keep only ours, in a private object (process.env stays untouched).
      const loaded = loadEnv(config.mode, config.envDir || config.root, "");
      const env: Record<string, string | undefined> = {};
      for (const key of ENV_KEYS) env[key] = loaded[key] ?? process.env[key];
      serve = createChatHandler({ env });
    },
    configureServer(server) {
      server.middlewares.use(path, (req, res, next) => {
        const original = (req as { originalUrl?: string }).originalUrl ?? req.url ?? path;
        // Connect matches prefixes: /api/chat-other isn't ours.
        const pathname = original.split("?")[0];
        if (pathname !== path && pathname !== `${path}/`) return next();
        const origin = `http://${req.headers.host ?? "localhost"}`;
        void (async () => {
          try {
            await sendWebResponse(res, await serve!(toWebRequest(req, res, new URL(original, origin).href)));
          } catch (err) {
            server.config.logger.error(`[web-agents/chat] ${String((err as Error)?.stack ?? err)}`);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end();
            }
          }
        })();
      });
    },
  };
}
