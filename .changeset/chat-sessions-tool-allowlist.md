---
"@webmcp-agents/chat": minor
---

Harden `/api/chat` against use outside the page.

- `createChatHandler({ session })`: the page's first `GET` sets a random, HMAC-signed, httpOnly `SameSite=Strict`
  session cookie (`WEB_AGENTS_SESSION_SECRET`); a `POST` without a valid one gets `401 session_required`. `verify` gates
  new sessions behind a bot check. The cloud adapter needs no change: it starts a session and retries once on that 401.
  `webAgentsChatDev` turns sessions on by default.
- `createChatHandler({ tools })`: a server-side tool allowlist. `defineWebTool` tools are pinned (the model gets the
  server's description and schema, never the request's); tool ids allow inline component tools; anything else is
  dropped. Ids listed by registered agents are allowed too.
- `createChatHandler({ requireAgent })` refuses requests that name no agent.
- `beforeModel` gets `{ agent, session }`, for per-session limits.
- The default system prompt keeps the model to the site: it declines unrelated requests in one sentence.
- Cloudflare Turnstile for new sessions: `session: { turnstile }` (server, `TURNSTILE_SECRET_KEY`, also
  `turnstileVerify`) and `createCloudAdapter({ sessionHeaders: turnstileHeaders({ siteKey }) })` (page). The widget
  loads only when a session is needed and is invisible unless Cloudflare wants a click.
