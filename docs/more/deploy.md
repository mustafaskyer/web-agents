---
title: Deploy
description: Put the chat route and its environment variables on a host, guard it against abuse, and smoke test it. Vercel for the Vite and Next.js apps is what the examples run; TanStack Start and Astro describe the shape.
sidebar:
  label: Deploy
related:
  - /build/add-the-chat
  - /reference/chat/create-chat-handler
  - /reference/vercel-api/create-vercel-chat-route
---

A WebMCP Agents site has exactly one piece of server code: the chat's `/api/chat` route, where the model runs and the key
lives. Everything else (the tools, the cursor, the devtools) is static JavaScript in the browser. So deploying is:
**ship the static site, run the route on a server, give the server the key, and put guards in front of it.**

What is tested: the Vite examples (`apps/playground`, `apps/ecommerce`, `apps/flights`) deploy as static SPAs whose
`api/chat.ts` is a Vercel Function, and `apps/nextjs` deploys as a Next.js project. The TanStack Start and Astro sections
describe the shape of the same route on those frameworks; no example app is deployed from them yet.

## 1. The route on your framework

The route is `createChatHandler` from `@webmcp-agents/chat/server`: a web-standard `(Request) => Response` function, which is
why it runs on any host that runs server code. See [Add the chat](/build/add-the-chat) for the route in each framework.
What differs is where the route sits and what the host needs.

### Vite

Vite builds a static site, so the route is a separate function. On Vercel, `api/chat.ts` at the project root is one:

```json vercel.json
{
  "framework": "vite",
  "rewrites": [{ "source": "/((?!api/|assets/).*)", "destination": "/index.html" }],
  "functions": { "api/chat.ts": { "maxDuration": 60 } }
}
```

The rewrite serves `index.html` for every path except `/api/*` and `/assets/*`, so deep links like `/product/ocean-tee`
work. `maxDuration: 60` is the function's limit; each tool step is its own request, so a long multi-step turn never hits it.
Any other host that runs a `Request` to `Response` function works the same way.

### Next.js

The route is `app/api/chat/route.ts`, part of the Next.js project, so there is no second thing to deploy. On Vercel the
project's framework is Next.js:

```json vercel.json
{
  "framework": "nextjs",
  "functions": { "app/api/chat/route.ts": { "maxDuration": 60 } }
}
```

Read the key through a `server-only` module, as [Field Store on Next.js](/examples/nextjs) does, so a client component
cannot import it by accident.

### TanStack Start

The route is `src/routes/api/chat.ts`, a server route of the Start app, so it deploys wherever the Start server does. Pick
the host and its build preset from TanStack Start's hosting guide; the chat adds nothing to that except the environment
variables below, set on the server. Not deployed from this project's examples yet.

### Astro

The route is `src/pages/api/chat.ts` with `export const prerender = false`, so the site needs a server adapter (Node,
Vercel, Netlify, Cloudflare, …); a fully static Astro build has nowhere to run it. Set the environment variables on the
host: the route reads them through `getSecret` from `astro:env/server` at request time. Not deployed from this project's
examples yet.

## 2. Environment variables (server-side only)

The key and the model are read on the server. Never give them a public prefix: `VITE_` (Vite, TanStack Start),
`NEXT_PUBLIC_` (Next.js) and `PUBLIC_` (Astro) variables are copied into the JavaScript the browser downloads.

| Var | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` (or the key of the provider in `WEB_AGENTS_MODEL`: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, …) | for chat | none | Enables `/api/chat`. Without it the widget shows "Chat isn't configured" and the app works; the function log names the variable. |
| `AI_GATEWAY_API_KEY` | no | none | Serves any `provider/model` id through the AI Gateway when the provider's own key is missing. |
| `WEB_AGENTS_MODEL` | no | `anthropic/claude-sonnet-5-5` in the examples | The model, as `<provider>/<model>`. See [Pick a model](/build/add-the-chat#pick-a-model). |

The next rows are read by `@webmcp-agents/vercel-api`, the guards the example apps use (section 3). They do nothing in a
route that does not use it.

| Var | Default | Purpose |
|---|---|---|
| `WEB_AGENTS_MAX_OUTPUT_TOKENS` | `4096` | Per model step; a thinking model's reasoning counts against it. |
| `WEB_AGENTS_MAX_STEPS` | `6` | Tool steps per user message (counted from the conversation the browser sends). |
| `RATE_LIMIT_PER_MINUTE` | `30` | Per IP. Each tool step is one request (a 6-step turn is 7): keep room for a few turns. |
| `RATE_LIMIT_PER_DAY` | `300` | Per IP. |
| `RATE_LIMIT_GLOBAL_DAILY` | `3000` | Model calls across all visitors (malformed requests do not count). Past it the chat says "daily limit reached, try tomorrow". |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | none | Upstash Redis, set by the Vercel Marketplace integration (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work). Recommended. |

On Vercel, set the key without it passing through a file or a chat:

```bash
vercel env add ANTHROPIC_API_KEY production   # paste the key at the prompt
vercel env add ANTHROPIC_API_KEY preview
```

To rotate it: create a new key in the provider's console, `vercel env rm ANTHROPIC_API_KEY production` and `vercel env add …`,
redeploy, and revoke the old key.

## 3. Guards

The route refuses browser requests from other sites, but anyone can still call it directly, and every call costs model
tokens. A public deployment needs a guard in front of the model.

`createChatHandler` takes two hooks for it: **`guard`** runs first and returns a `Response` to end the request (origin
checks, per-IP rate limits), and **`beforeModel`** runs after the request is validated, right before the model call (a
global budget, so malformed requests never use it up). See [`createChatHandler`](/reference/chat/create-chat-handler).

The example apps use `@webmcp-agents/vercel-api` for both: the origin allow-list, per-IP limits per minute and per day, and
a global daily budget, as one line, `createVercelChatRoute({ app, agents })`. That package is private and not on npm: read
[its reference page](/reference/vercel-api/create-vercel-chat-route) and `packages/vercel-api/src` as a starting point
for your own guards. Without Redis each function instance counts on its own (a warning is logged), so limits are per
instance, not global; add **Upstash Redis** from the Vercel Marketplace for real ones. If Redis stops answering (or rejects
the token), per-IP limits let requests through (the chat stays up) and the global budget refuses them (the bill stays
bounded; the chat says it is busy).

POSTs must carry the deployment's own `Origin` (any domain it is served on, `vercel dev` included); other sites' pages are
refused. Any script can fake an `Origin` header, so the real protection is the per-IP limits, the global budget and the
per-request token cap. The step cap is counted from the conversation the browser sends, so a scripted caller can sidestep
it: the budget is what bounds the bill.

## 4. Create the projects on Vercel

For each app, in the Vercel dashboard (Add New, then Project, then import the repo), or with the CLI (`vercel link` in
`apps/<name>`):

| Setting | Value |
|---|---|
| Root Directory | `apps/playground` (or `apps/ecommerce`, `apps/flights`, `apps/nextjs`) |
| Framework | Vite (set by `vercel.json`); Next.js for `apps/nextjs` |
| Build, install, output | from `vercel.json`: `turbo run build`, `pnpm install --frozen-lockfile`, `dist` (Vite apps) |
| Node.js version | 24.x (the AI SDK needs Node 22+) |
| Skip unaffected projects | on (`vercel.json`'s `ignoreCommand: npx turbo-ignore` does the same from code) |

Then deploy, and smoke test the deployment:

```bash
vercel deploy            # preview: check it, then
vercel deploy --prod
```

```bash
P=https://<deployment>
curl -s $P/api/chat   # {"enabled":true,"model":"anthropic/claude-sonnet-5-5","provider":"anthropic","agents":[…]}
curl -s -o /dev/null -w "%{http_code}\n" $P/some/deep/link                  # 200 (SPA rewrite, Vite apps)
# a foreign origin is refused
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$P/api/chat" \
  -H 'origin: https://evil.example' -H 'content-type: application/json' -d '{}'   # 403
# the per-minute limit: the 31st request in a minute gets 429
BODY='{"messages":[{"id":"u","role":"user","parts":[{"type":"text","text":"hi"}]}],"tools":[]}'
for i in $(seq 1 32); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$P/api/chat" -H "origin: $P" -H 'content-type: application/json' -d "$BODY"
done; echo
```

The last two checks apply to a route behind the example guards; with your own, test what your guards promise.

## Notes

- **The polyfill.** The provider loads it in production too, so in browsers without native WebMCP the deployed demos
  have their tools and the chat works. To ship native WebMCP only, pass `polyfill={false}`
  ([In production](/more/polyfill#in-production)).
- **The on-device assistant** (`@webmcp-agents/local-agent`) runs ONNX Runtime single-threaded. Cross-origin isolation (COOP
  `same-origin` plus COEP `require-corp`) makes WASM several times faster but breaks third-party embeds, so the
  `vercel.json` files do not set it.
- **ONNX Runtime's WASM** (about 27 MB) is a static asset of the build; it is fetched only after a visitor chooses On-device
  and clicks Download.

## The website

`apps/docs` is the whole website, a static [Blume](https://github.com/haydenbleasel/blume) site: the landing page at `/`
(a custom page whose own actions are WebMCP tools, built on the packages) and the `docs/` folder under `/docs`. It is its
own Vercel project and needs no secrets.

| Setting | Value |
|---|---|
| Root Directory | `apps/docs` |
| Framework | none (`"framework": null` in `vercel.json`) |
| Build, install, output | from `vercel.json`: `turbo run build`, `pnpm install --frozen-lockfile`, `dist` |
| Include source files outside of the Root Directory | on (the default): the content is `../../docs` |
| Skip builds | `vercel.json`'s `ignoreCommand` skips a commit that touches neither `apps/docs`, `docs/`, `packages/` nor the lockfile |
| `VERCEL_DEEP_CLONE` | optional, `true`: full git history, so pages show their real "last modified" date |

Blume picks up the production domain from the host's environment for canonical URLs, the sitemap and Open Graph images
(or from `SITE_URL`). `SITE_URL` also fills the registry URL on the shadcn chat blocks page, so set it to the site's origin. `vercel.json` also sets the content types of the raw Markdown copies (`/<page>.md`) and `llms.txt`, and
holds the redirects from the routes the docs had before they were ordered by framework and by step: the same list as
`redirects` in `apps/docs/blume.config.ts`, because a Git-connected Vercel project reads only the root `vercel.json`.

```bash
D=https://<site-deployment>
curl -s -o /dev/null -w "%{http_code}\n" $D/                                        # 200, the landing page
curl -s -o /dev/null -w "%{http_code}\n" $D/docs/reference/core/define-web-tool     # 200
curl -sI $D/docs/reference/core/define-web-tool.md | grep -i content-type            # text/markdown; charset=utf-8
curl -s $D/llms.txt | head -5
```

## Publishing the packages

`.github/workflows/release.yml` runs Changesets on `main`: pending changesets become a "Version Packages" PR, and merging
it publishes the seven public `@webmcp-agents/*` packages to npm with provenance. One-time setup, by the maintainer: own the
`@webmcp-agents` scope on npm, then add an `NPM_TOKEN` repository secret (an automation token), or configure npm trusted
publishing for the repo. `pnpm turbo run check-exports` runs publint and are-the-types-wrong on every package.
