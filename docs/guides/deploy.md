# Deploy to Vercel

Each app (`apps/playground`, `apps/ecommerce`, `apps/flights`, `apps/nextjs`) is its own Vercel project. The Vite
apps are static SPAs whose `api/chat.ts` is a Vercel Function; the Next.js app deploys as a Next.js project whose
`app/api/chat/route.ts` is the same handler. Both serve the chat through `@webmcp-agents/vercel-api`:
`@webmcp-agents/chat`'s handler behind a same-origin check, per-IP rate limits and a daily budget on model calls.

## 1. Create the projects

For each app, in the Vercel dashboard (Add New → Project → import the repo), or with the CLI (`vercel link` in
`apps/<name>`):

| Setting | Value |
|---|---|
| Root Directory | `apps/playground` (or `apps/ecommerce`, `apps/flights`, `apps/nextjs`) |
| Framework | Vite (set by `vercel.json`); Next.js for `apps/nextjs` |
| Build / install / output | from `vercel.json`: `turbo run build`, `pnpm install --frozen-lockfile`, `dist` |
| Node.js version | 24.x (AI SDK v7 needs Node 22+) |
| Skip unaffected projects | on (`vercel.json`'s `ignoreCommand: npx turbo-ignore` does the same from code) |

`vercel.json` also sets the SPA rewrite (everything but `/api/*` and `/assets/*` serves `index.html`, so deep links
like `/product/ocean-tee` work), immutable caching for `/assets/*`, and `maxDuration: 60` for the chat function. Each
tool step is its own request, so a long multi-step turn never hits that limit.

## 2. Environment variables (server-side only)

Never prefix these with `VITE_`: Vite ships `VITE_*` variables to the browser.

| Var | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` (or the key of the provider in `WEB_AGENTS_MODEL`: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, …) | for chat | — | Enables `/api/chat`. Without it the widget shows "Chat isn't configured" and the app works; the function log names the variable. |
| `AI_GATEWAY_API_KEY` | no | — | Serves any `provider/model` id through the AI Gateway when the provider's own key is missing. |
| `WEB_AGENTS_MODEL` | no | `anthropic/claude-sonnet-5-5` | The model, as `<provider>/<model>` (local dev defaults to `anthropic/claude-opus-5-5`). See [Pick a model](./chat.mdx#pick-a-model). |
| `WEB_AGENTS_MAX_OUTPUT_TOKENS` | no | `4096` | Per model step; a thinking model's reasoning counts against it. |
| `WEB_AGENTS_MAX_STEPS` | no | `6` | Tool steps per user message (counted from the conversation the browser sends). |
| `RATE_LIMIT_PER_MINUTE` | no | `30` | Per IP. Each tool step is one request (a 6-step turn is 7): keep room for a few turns. |
| `RATE_LIMIT_PER_DAY` | no | `300` | Per IP. |
| `RATE_LIMIT_GLOBAL_DAILY` | no | `3000` | Model calls across all visitors (malformed requests don't count). Past it the chat says "daily limit reached, try tomorrow". |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | recommended | — | Upstash Redis, set by the Marketplace integration (`UPSTASH_REDIS_REST_URL`/`_TOKEN` also work). |

```bash
cd apps/playground
vercel env add ANTHROPIC_API_KEY production   # paste the key at the prompt; never in a file or a chat
vercel env add ANTHROPIC_API_KEY preview
```

To rotate the key: create a new one in the Anthropic Console, `vercel env rm ANTHROPIC_API_KEY production` then
`vercel env add …`, redeploy, and revoke the old key.

## 3. Rate limiting storage

Without Redis each function instance counts on its own (a warning is logged), so limits are per instance, not
global. Add **Upstash Redis** from the Vercel Marketplace (Storage → Upstash → connect to the three projects) for
real limits. If Redis stops answering (or rejects the token), per-IP limits let requests through (the chat stays up)
and the global budget refuses them (the bill stays bounded; the chat says it's busy).

POSTs must carry the deployment's own `Origin` (any domain it's served on, `vercel dev` included); other sites' pages
are refused. Any script can fake an `Origin` header, so the real protection is the per-IP limits, the global budget
and the per-request token cap. The step cap is counted from the conversation the browser sends, so a scripted caller
can sidestep it: the budget is what bounds the bill.

## 4. Deploy

```bash
vercel deploy            # preview: check it, then
vercel deploy --prod
```

Smoke test a deployment:

```bash
P=https://<deployment>
curl -s $P/api/chat   # {"enabled":true,"model":"anthropic/claude-sonnet-5-5","provider":"anthropic","agents":[…]}
curl -s -o /dev/null -w "%{http_code}\n" $P/some/deep/link                  # 200 (SPA rewrite)
# a foreign origin is refused (CSRF)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$P/api/chat" \
  -H 'origin: https://evil.example' -H 'content-type: application/json' -d '{}'   # 403
# the per-minute limit: the 31st request in a minute gets 429
BODY='{"messages":[{"id":"u","role":"user","parts":[{"type":"text","text":"hi"}]}],"tools":[]}'
for i in $(seq 1 32); do
  curl -s -o /dev/null -w "%{http_code} " -X POST "$P/api/chat" -H "origin: $P" -H 'content-type: application/json' -d "$BODY"
done; echo
```

## Notes

- The WebMCP polyfill loads in development only, so in browsers without native WebMCP the deployed demos have no
  tools for the chat to call. To ship it in a demo, import `@webmcp-agents/polyfill/auto` behind a
  `VITE_WEBMCP_POLYFILL` check in each app's `main.tsx`.
- The on-device assistant (`@webmcp-agents/local-agent`) runs ONNX Runtime single-threaded. Cross-origin isolation
  (COOP `same-origin` + COEP `require-corp`) makes WASM several times faster but breaks third-party embeds, so the
  `vercel.json` files don't set it.
- The build includes ONNX Runtime's ~27 MB WASM as a static asset; it's fetched only after a visitor chooses
  On-device and clicks Download.

## The website

`apps/docs` is the whole website, a static [Blume](https://github.com/haydenbleasel/blume) site: the landing page at `/`
(a custom page whose own actions are WebMCP tools, built on the packages) and this `docs/` folder under `/docs`. It is
its own Vercel project and needs no secrets.

| Setting | Value |
|---|---|
| Root Directory | `apps/docs` |
| Framework | none (`"framework": null` in `vercel.json`) |
| Build / install / output | from `vercel.json`: `turbo run build`, `pnpm install --frozen-lockfile`, `dist` |
| Include source files outside of the Root Directory | on (the default): the content is `../../docs` |
| Skip builds | `vercel.json`'s `ignoreCommand` skips a commit that touches neither `apps/docs`, `docs/`, `packages/` nor the lockfile |
| `VERCEL_DEEP_CLONE` | optional, `true`: full git history, so pages show their real "last modified" date |

Blume picks up the production domain from Vercel's environment for canonical URLs, the sitemap and Open Graph images.
`vercel.json` also sets the content types of the raw Markdown copies (`/<page>.md`) and `llms.txt`.

Smoke test a deployment:

```bash
D=https://<site-deployment>
curl -s -o /dev/null -w "%{http_code}\n" $D/                                        # 200, the landing page
curl -s -o /dev/null -w "%{http_code}\n" $D/docs/reference/core/define-web-tool     # 200
curl -sI $D/docs/reference/core/define-web-tool.md | grep -i content-type            # text/markdown; charset=utf-8
curl -s $D/llms.txt | head -5
```

## Publishing the packages

`.github/workflows/release.yml` runs Changesets on `main`: pending changesets become a "Version Packages" PR, and
merging it publishes the six public `@webmcp-agents/*` packages to npm with provenance. One-time setup, by the
maintainer: own the `@webmcp-agents` scope on npm, then add an `NPM_TOKEN` repository secret (an automation token), or
configure npm trusted publishing for the repo. `pnpm turbo run check-exports` runs publint and are-the-types-wrong on
every package.
