/**
 * @webmcp-agents/chat/vite: serve `/api/chat` from `vite dev`, so the widget works
 * locally without a separate server. The API key is read from `.env` files
 * server-side (never a VITE_-prefixed variable: those are shipped to the browser).
 *
 *   plugins: [react(), webAgentsChatDev()]                     // ANTHROPIC_API_KEY in .env.local
 */
import type { Plugin } from "vite";
import { loadEnv } from "vite";
import type { WebAgent } from "../agent";
import { createChatHandler } from "../server/handler";
import { sendWebResponse, toWebRequest } from "./node-bridge";

/** Options for `webAgentsChatDev`. */
export interface WebAgentsChatDevOptions {
  /** Mount path. Default "/api/chat". */
  path?: string;
  /** The handler to serve. Default `createChatHandler({ env })` with the env read from the project's .env files. */
  handler?: (req: Request) => Promise<Response>;
  /**
   * Refuse to start when a `VITE_*` variable looks like a secret (`*_API_KEY`, `*_SECRET`, `*_TOKEN`): Vite inlines
   * every `VITE_` variable into the browser bundle. Default true.
   */
  secretGuard?: boolean;
  /** The page's agents (`defineWebAgent`), for the default handler: the same list the page passes to `<AgentChat>`. */
  agents?: readonly WebAgent[];
  /**
   * Which variables from the `.env` files (and `process.env`) reach the default handler. Default: every `*_API_KEY`,
   * `AI_GATEWAY_*`, `VERCEL_OIDC_TOKEN` and `WEB_AGENTS_*`.
   */
  envKeys?: (key: string) => boolean;
}

/** The server-side variables the handler reads: provider keys, the gateway's, and the WEB_AGENTS_* settings. */
const SERVER_ENV = /^(.*_API_KEY|AI_GATEWAY_.*|VERCEL_OIDC_TOKEN|WEB_AGENTS_.*)$/;

/** A `VITE_` variable Vite would ship to the browser, named like a secret. */
const LEAKY = /^VITE_.*(_API_KEY|_SECRET|_TOKEN)$/;

/** A Vite plugin that serves the chat endpoint during `vite dev` (`apply: "serve"`: nothing in builds). */
export function webAgentsChatDev({
  path = "/api/chat",
  handler,
  secretGuard = true,
  agents,
  envKeys = (key) => SERVER_ENV.test(key),
}: WebAgentsChatDevOptions = {}): Plugin {
  let serve = handler;
  return {
    name: "web-agents-chat-dev",
    apply: "serve",
    configResolved(config) {
      // "" prefix: load every variable, then keep only ours, in a private object (process.env stays untouched).
      const loaded = loadEnv(config.mode, config.envDir || config.root, "");
      const leaking = Object.keys(loaded).filter((key) => LEAKY.test(key));
      if (secretGuard && leaking.length) {
        throw new Error(
          `[web-agents/chat] VITE_* variables ship to the browser: rename ${leaking.join(", ")} and keep it server-side ` +
            "(the chat handler reads keys from the server env, e.g. ANTHROPIC_API_KEY). Pass `secretGuard: false` to allow it.",
        );
      }
      if (serve) return;
      const env: Record<string, string | undefined> = {};
      for (const key of new Set([...Object.keys(loaded), ...Object.keys(process.env)])) {
        if (envKeys(key)) env[key] = loaded[key] ?? process.env[key];
      }
      serve = createChatHandler({ env, agents });
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
