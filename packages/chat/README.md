# @web-agents/chat

A chat widget whose agent works the **live page** through its WebMCP tools (`document.modelContext`). The model
runs on your server (Claude via the Vercel AI SDK) with the key server-side; every tool call runs **in the browser**,
so the agent cursor from `@web-agents/core` plays exactly as it does for any agent, and anything a form gates on a
click (orders, bookings) waits for the person.

```bash
pnpm add @web-agents/chat @ai-sdk/anthropic   # @ai-sdk/anthropic: server only
```

## Client

```tsx
import { AgentChat, createCloudAdapter } from "@web-agents/chat";
import "@web-agents/chat/chat.css";

const cloud = createCloudAdapter(); // POSTs to /api/chat; create it once (module scope)

<WebAgentsProvider tools={catalog} …>
  …
  <AgentChat adapter={cloud} />      {/* inside the provider: the model sees the tools this page has on */}
</WebAgentsProvider>
```

`<AgentChat>` props: `adapter` or `adapters` (several show a switcher), `title`, `defaultOpen`, `position`
(`"bottom-right" | "bottom-left"`), `suggestions` (`string[] | false`, default: from the page's tools), `className`,
`storageKey` (sessionStorage key, `false` for memory only), `layout` (`"docked" | "floating"`). The conversation
survives route changes and reloads.

`layout="docked"` (default) puts the open panel beside the page, full height, on the `position` side: the page makes
room (a body margin), so the agent never works under the chat. Drag its inner edge, or focus it and use the arrow keys,
to resize (320 px up to the window minus 360 px; remembered). While docked, `<html>` gets `data-wa-chat-dock` and
`--wa-chat-inset-left` / `--wa-chat-inset-right`: offset your own fixed UI (drawers, toasts) with them. Below 640 px it
is a bottom sheet. `layout="floating"` keeps the pop-over over the page.

Theme with CSS custom properties on `.wa-chat` (`--wa-chat-accent` defaults to the cursor's `--agent`). Dark mode
follows `prefers-color-scheme`, or `data-theme="dark"` on an ancestor.

## Server: `/api/chat`

```ts
// api/chat.ts (Vercel) — any runtime with web Request/Response works the same way
import { createChatHandler } from "@web-agents/chat/server";
const handler = createChatHandler();
export const GET = handler;
export const POST = handler;
```

| Option | Default | |
|---|---|---|
| `model` | `WEB_AGENTS_MODEL` ?? `"claude-opus-5-5"` | A Claude model id, or any AI SDK `LanguageModel` |
| `effort` | `"low"` | Claude effort per step (Claude Opus 5.5 always thinks; effort sets how much) |
| `maxOutputTokens` | `8192` | Per step; thinking counts against it |
| `maxSteps` | `8` | Tool steps per user turn; the request after the last one gets no tools, so the model sums up |
| `system` | `DEFAULT_SYSTEM_PROMPT` | Acting on a live page, confirmations, `Error:` results, short replies |
| `guard` | none | `(req) => Response \| undefined`: rate limits, origin checks (runs first) |
| `beforeModel` | none | Same shape, after validation and right before the model call: count budgets here |
| `env` | `process.env` | Where `ANTHROPIC_API_KEY` / `WEB_AGENTS_MODEL` are read |

`GET` returns `{ enabled, model }` (the widget shows "Chat isn't configured" without a key); `POST` without a key is
`503 chat_disabled`. With a Claude model id, requests use server-side refusal fallbacks (`fallbacks: "default"`).

## Dev: `vite dev`

```ts
// vite.config.ts
import { webAgentsChatDev } from "@web-agents/chat/vite";
export default defineConfig({ plugins: [react(), webAgentsChatDev()] });
```

Put `ANTHROPIC_API_KEY=…` in `.env.local`. It's read on the server side only. Never use a `VITE_`-prefixed name:
Vite ships those to the browser.

## Security notes

- The key never leaves the server; the client bundle contains no provider SDK (a Biome rule keeps it out).
- Every request is validated: JSON only, ≤ 1 MB (counted while streaming), ≤ 160 messages, ≤ 48 tools with unique
  `[a-zA-Z0-9_.-]` names, schemas ≤ 8 KB, texts capped. Tool descriptions are page text: they go in tool definitions
  only, never the system prompt; of the page itself only its same-origin path reaches the prompt.
- Browser requests from another site are refused (403), so no other page can spend your key through a visitor's
  browser, in dev or in production.
- That is not abuse protection: anyone can still call the endpoint directly. **A public deployment needs `guard`**
  (rate limiting per IP/session, a token budget): see the Phase 7 plan.

## Custom agents

Implement `AgentAdapter` (`run(req)` yields `AgentStreamPart`s and calls `req.callTool()` for each tool call; read
`req.tools` fresh before every model call). `callModelContextTool()` and `listToolDescriptors()` are exported for
adapters that don't use the widget. `@web-agents/local-agent` (in-browser models) plugs in the same way.

## When a tool fails

A failed tool never ends the run: the result goes back to the model, coded (`Error [timeout]: …`, see core's
error codes), and both system prompts say what to do per code. `callModelContextTool`:

- answers `cancelled` only for the person's Stop; a call the page cancelled (a navigation, the tool re-registered) is
  `interrupted`, so the agent checks the page and carries on instead of stopping;
- stops a tool that hasn't answered in `TOOL_TIMEOUT_MS` (30 s; `timeoutMs` option, `0` for none) with `timeout`,
  cancelling the call. The clock stops for good once the tool waits for the person (a confirm, a `waitingForUser`);
- codes the rest: `unavailable` (not on this page), `failed` (a throw, or a plain `"Error: …"` answer).

If the run itself fails (the model, the network), **Try again** resumes it: the conversation is sent through the
last tool call that finished (`resumable(messages)`), so the agent continues from there and nothing is done twice.
With nothing finished yet, the turn starts over.
