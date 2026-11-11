/**
 * The page's half of Turnstile-gated chat sessions: solve a Cloudflare Turnstile challenge when the server asks for a
 * session, and hand the token to the cloud adapter.
 *
 *   createCloudAdapter({ sessionHeaders: turnstileHeaders({ siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY }) })
 *
 * Nothing loads until the first message needs a session: Cloudflare's script is injected then, the widget renders
 * with `appearance: "interaction-only"` (invisible unless Cloudflare wants a click), and it is removed once it has
 * answered. Each session takes a fresh token (they are single-use). The server checks it with
 * `createChatHandler({ session: { turnstile: true } })`.
 */
import { UI_HOST_ATTR } from "@webmcp-agents/core";

/** Options for `turnstileHeaders`. */
export interface TurnstileHeadersOptions {
  /** The widget's site key (public; from the Cloudflare dashboard). */
  siteKey: string;
  /** The action the token carries, checked by the server when its `action` option is set. Default `"web_agents_chat"`. */
  action?: string;
  /** The header the token goes in. Default `"x-turnstile-token"` (what the server reads). */
  header?: string;
  /** Milliseconds to wait for a token (a person may have to click). Default 60000. */
  timeout?: number;
}

/** The subset of Cloudflare's `window.turnstile` used here. */
interface TurnstileApi {
  render(container: HTMLElement, params: Record<string, unknown>): string | undefined;
  remove(widgetId: string): void;
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | undefined;

/** Cloudflare's script, injected once per page (never bundled or cached: Cloudflare updates it). */
function loadTurnstile(): Promise<TurnstileApi> {
  const existing = (window as { turnstile?: TurnstileApi }).turnstile;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const api = (window as { turnstile?: TurnstileApi }).turnstile;
      if (api) resolve(api);
      else reject(new Error("Turnstile's script loaded without window.turnstile."));
    };
    script.onerror = () => {
      loading = undefined; // a later message may try again
      reject(new Error("Couldn't load Turnstile (blocked, offline, or a Content-Security-Policy without challenges.cloudflare.com)."));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * `sessionHeaders` for `createCloudAdapter`: solves a Turnstile challenge and resolves to `{ "x-turnstile-token": … }`.
 * Rejects when the script can't load, the widget errors, or no token comes within `timeout`.
 */
export function turnstileHeaders(options: TurnstileHeadersOptions): () => Promise<Record<string, string>> {
  const { siteKey, action = "web_agents_chat", header = "x-turnstile-token", timeout = 60_000 } = options;
  return async () => {
    const turnstile = await loadTurnstile();
    // bottom-centre, above the page; marked as library UI so a click on it never makes the agent's cursor yield
    const host = document.createElement("div");
    host.setAttribute(UI_HOST_ATTR, "turnstile");
    host.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647";
    document.body.append(host);
    let widget: string | undefined;
    try {
      return await new Promise<Record<string, string>>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Turnstile gave no token in time.")), timeout);
        const fail = (what: string) => () => {
          clearTimeout(timer);
          reject(new Error(`Turnstile: ${what}.`));
        };
        widget = turnstile.render(host, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          callback: (token: string) => {
            clearTimeout(timer);
            resolve({ [header]: token });
          },
          "error-callback": fail("the challenge failed"),
          "expired-callback": fail("the token expired"),
          "timeout-callback": fail("the challenge timed out"),
        });
      });
    } finally {
      if (widget) turnstile.remove(widget);
      host.remove();
    }
  };
}
