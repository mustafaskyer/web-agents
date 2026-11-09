# Feature: `defineWebAgent` (instructions, tool subsets, sub-agents) on the AI SDK `ToolLoopAgent` + any frontier model, Phase 11

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

Read first:
- `.agents/plans/00-web-agents-roadmap.md` (contracts; update the `@webmcp-agents/chat` block and the "Agent runtime" / "Default model" rows in the same commit)
- `.agents/plans/05-chat-widget-cloud-agent.md` (how the handler, cloud adapter and session were built)
- `.agents/plans/06-in-browser-agent.md` (the on-device loop that must honour the same agent definition)
- `/Users/mustafaelsayed/.claude/plans/feature-and-some-fixes-nifty-goose.md` Part A (the approved design, with the
  "API by example" section A0 that every snippet in the docs should match)

## Feature Description

Two things, one package:

1. **Agents.** `defineWebAgent({ id, instructions, tools?, agents?, model?, maxSteps? })` is the one agent API,
   mirroring `defineWebTool`. A `WebAgent` is plain data shared by the browser (filter the page's tools, run
   sub-agents under the cursor, feed the on-device model) and the server (instructions, allow-list, model). On the
   server the handler derives an AI SDK **`ToolLoopAgent`** per request (`toToolLoopAgent(agent, { model, tools })`):
   the ecosystem runtime, never hand-rolled. Sub-agents follow the AI SDK pattern "an agent exposed as a tool": each
   sub-agent is a client-executed `delegate_to_<id>` tool; the chat runs the nested loop on the same adapter, so page
   tools still run in the browser under the cursor and the one-step-per-request protocol is unchanged. Instructions
   never cross the wire: the browser sends the agent `id`, the server looks it up in its registry.
2. **Any frontier model.** Model ids become `"<provider>/<model>"` resolved by `resolveModel` (`packages/chat/src/
   server/models.ts`): the provider's optional `@ai-sdk/*` package when its key is set (anthropic, openai, google,
   deepseek, xai, mistral), **OpenRouter** via `@openrouter/ai-sdk-provider` (`openrouter/<vendor>/<model>`), else the
   AI Gateway built into `ai` (`AI_GATEWAY_API_KEY`). Provider-neutral `reasoning: "off" | "low" | "medium" | "high"`.
   A `WebAgent.model` string lets a sub-agent run on a cheaper model.

## User Story

As a site developer
I want to write one agent definition (what it knows, which tools it may use, which helpers it can call) and have the
cloud chat, the on-device chat and my server all honour it
So that my assistant follows the site's flow without me duplicating prompts or trusting page text on the server

As a site developer
I want `WEB_AGENTS_MODEL=openai/gpt-5.5` (or `openrouter/…`, `deepseek/…`) with the matching key to just work
So that I can pick the model per site, or per sub-agent, without touching code

## Problem Statement

- No agent concept: `AgentRunRequest`, `AgentChatProps`, `UseAgentSessionOptions` and `chatRequestSchema` carry no
  instructions or agent; only `createLocalAdapter({ instructions })` exists, so the cloud path has no site
  instructions (`apps/*/src/Root.tsx`).
- `createChatHandler` treats any string as a Claude id, checks only `ANTHROPIC_API_KEY`, passes Anthropic-only
  `providerOptions` (`handler.ts:101-153`); the Vite plugin forwards two env keys (`vite/index.ts:21`); the cloud
  adapter's label and `id` are hard-coded (`cloud.ts:116`).

## Solution Statement

See the approved design: Part A0 (examples), A1 (`agent.ts`), A2 (server: `toToolLoopAgent`, `createAgentUIStreamResponse`),
A3 (session: `selectTools` through the `tools` getter, nested delegate run with `within`), A4 (`models.ts`), A5
(example apps), A6 (tests), A7 (docs).

## Feature Metadata

**Feature Type**: New capability (+ provider refactor)
**Estimated Complexity**: High
**Primary Systems Affected**: `packages/chat` (new `src/agent.ts`, `src/server/web-agent.ts`, `src/server/models.ts`;
handler, validate, system-prompt, vite plugin, cloud adapter, wire, types, reducer, session, AgentChat, ToolCallCard,
MessageList, chat.css), `packages/local-agent` (loop, prompt, index), `packages/vercel-api`, `apps/ecommerce`,
`apps/flights`, `biome.json`, docs, roadmap
**Dependencies**: optional peers + devDependencies of `@webmcp-agents/chat`: `@ai-sdk/openai` (4.0.111),
`@ai-sdk/google` (4.0.114), `@ai-sdk/deepseek` (3.0.81), `@ai-sdk/xai`, `@ai-sdk/mistral`,
`@openrouter/ai-sdk-provider` (3.1.0, peer `ai ^7`). Confirm versions with `npm view` before pinning.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `packages/core/src/web-tool.ts` 61-101, 148-160: `WebToolConfig` / `defineWebTool` / `WebTool`, the id pattern and
  the TypeError messages. Why: `defineWebAgent` mirrors them exactly.
- `packages/chat/src/types.ts`: `AgentAdapter`, `AgentRunRequest` (`tools` getter), `AgentPart`, `AgentStreamPart`.
- `packages/chat/src/session/use-agent-session.ts` 75-159: the request builder and `callTool` wrapper (the two
  interception points). `session/reducer.ts` 23-59, 82-173: `applyPart`, `updateTools`, `toolPhase`, `resumable`.
- `packages/chat/src/adapter/cloud.ts` 16-30, 73-78, 100-116, 139-209; `adapter/wire.ts` 13, 33-46, 86-126.
- `packages/chat/src/server/handler.ts` 38-166; `server/validate.ts` 11, 20-27, 55-63, 69-126; `server/system-prompt.ts`;
  `src/shared.ts` 10-27; `src/vite/index.ts` 14-35.
- `packages/chat/test/*`: `mock-model.ts` (`scriptedModel`), `handler.test.ts` (GET `toEqual` at 24), `cloud-adapter.test.ts`,
  `wire.test.ts`, `reducer.test.ts`, `vite-plugin.test.ts`, `agent-chat.browser.test.tsx` (`fakeAdapter` at 16),
  `browser-utils.ts` (`echoForm`, `uniqueName`, `until`). `vitest.config.ts` (projects `chat:node`, `chat:browser`).
- `packages/local-agent/src/loop.ts` 23-27, 115-176; `src/prompt.ts` 80-100; `src/index.ts` 18-27, 141-146.
- `packages/vercel-api/src/index.ts` 20-60.
- `apps/ecommerce/src/Root.tsx` 20-70, `apps/flights/src/Root.tsx`, `apps/*/vite.config.ts`, `apps/*/api/chat.ts`,
  `apps/*/src/tools/instructions.ts`, `apps/ecommerce/src/tools/catalog.ts` (tool ids for the `checkout` subset).
- `biome.json` 40-70 (`noRestrictedImports` override; add `src/agent.ts` to the client list and the `@ai-sdk/*` +
  `@openrouter/*` patterns).
- `node_modules/.pnpm/ai@7.0.163_zod@4.6.7/node_modules/ai/dist/index.d.ts`: `ToolLoopAgent`, `ToolLoopAgentSettings`
  (`instructions`, `tools`, `stopWhen`, `prepareStep`, `providerOptions`, `maxOutputTokens`),
  `createAgentUIStreamResponse({ agent, uiMessages, ...uiMessageStreamOptions })`, `gateway`/`createGateway`,
  `stepCountIs`. `@ai-sdk/anthropic` `providerOptions.anthropic` (`effort`, `fallbacks`) in its `dist/index.d.ts`.

### New Files to Create

```
packages/chat/src/agent.ts                     defineWebAgent, WebAgentConfig, WebAgent, flattenWebAgents, DELEGATE_PREFIX,
                                               delegateToolName, isDelegateTool, delegateTool, selectTools, DELEGATION_NOTE
packages/chat/src/server/web-agent.ts          toToolLoopAgentSettings(agent, opts), toToolLoopAgent(agent, opts)
packages/chat/src/server/models.ts             PROVIDERS, parseModelId, modelAvailability, resolveModel, providerOptionsFor,
                                               ModelUnavailableError, ReasoningLevel (displayName lives in src/shared.ts)
packages/chat/test/agent.test.ts
packages/chat/test/web-agent.test.ts
packages/chat/test/models.test.ts
packages/chat/test/agent-session.browser.test.tsx
apps/ecommerce/src/agents.ts                   checkout (sub-agent), shopper
apps/flights/src/agents.ts                     concierge
docs/guides/agents.mdx, docs/guides/frameworks.mdx
docs/reference/chat/define-web-agent.md, to-tool-loop-agent.md, resolve-model.md
```

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- AI SDK 7 `ToolLoopAgent` / `createAgentUIStreamResponse` (the installed `.d.ts` is authoritative; docs:
  https://ai-sdk.dev/docs/agents/building-agents). Tools without `execute` stop the loop after the step (client-side
  execution), which is exactly the protocol here; `stopWhen: stepCountIs(1)` keeps one step per request regardless.
- AI Gateway model ids use dots (`anthropic/claude-opus-5.5`); provider SDK ids use dashes (`claude-opus-5-5`): never
  reroute a bare id to the gateway.
- `@openrouter/ai-sdk-provider` README: `createOpenRouter({ apiKey })("anthropic/claude-opus-5.5")`, reasoning via
  `providerOptions.openrouter.reasoning` (verify at implementation).
- `packages/react/README.md` "Writing tool descriptions" (the delegate tool's description follows it).

### Patterns to Follow

- Isomorphic `agent.ts`: no DOM, React, `ai` or zod imports; TSDoc on every export; `Object.freeze` deep.
- Server-only code stays under `src/server/**` (Biome enforces the provider SDK rule).
- Validation errors are `TypeError`s that name the fix, like `defineWebTool`.
- Browser-run tool calls go through `callModelContextTool` → `toolsSettled()` → `refreshTools()` (nested runs included).
- Never register delegate tools on `document.modelContext` (they are descriptors appended in the `tools` getter).
- Tests: node for pure logic and the handler (`scriptedModel`), browser for the session with a `fakeAdapter`.

---

## IMPLEMENTATION PLAN

### Phase 1: `agent.ts` + exports (+ tests)
### Phase 2: `models.ts` + handler provider refactor (+ tests)
### Phase 3: server agents (`web-agent.ts`, validate, system prompt, handler, vite, vercel-api)
### Phase 4: client (types, reducer, session, components, cloud adapter)
### Phase 5: local-agent precedence
### Phase 6: example apps
### Phase 7: docs, roadmap, CLAUDE.md, changeset

---

## STEP-BY-STEP TASKS

### 1. CREATE `packages/chat/src/agent.ts`

Signatures in the approved plan A1. Validation: id pattern `/^[a-zA-Z0-9_.-]{1,64}$/`, non-empty instructions after
trim, positive integer `maxSteps`, sub-agents structurally checked (`id` string + `instructions` array; no
`instanceof`: dist and source copies coexist in dev), duplicate ids across the whole tree → TypeError. `selectTools`:
strip incoming `delegate_to_*`, apply `tools` (string[] keeps page order; function as is; default all), append
`delegateTool(sub)` per sub-agent (delegate wins an id clash). `delegateTool` schema `{ task: string (required),
context?: string }`, description = `sub.description ?? "Hand a task to the <id> agent."` + " It works this page with
its own tools and answers with what it did and found." (+ " Its tools: a, b." when `tools` is a list).
`package.json` `exports["./agent"]`, `tsdown.config.ts` entry `agent`, re-export from `src/index.ts` and
`src/server/index.ts`, biome override list. Test `test/agent.test.ts`.

### 2. CREATE `packages/chat/src/server/models.ts` (+ `displayName` in `src/shared.ts`)

`parseModelId` splits at the **first** slash (`openrouter/anthropic/claude-opus-5.5` → provider `openrouter`, model
`anthropic/claude-opus-5.5`); bare `claude-*` → anthropic; unknown prefix → gateway candidate. `modelAvailability`
is sync and never imports an SDK; its message names the exact env var(s) and, for a bare vendor id with only
`OPENROUTER_API_KEY`, suggests the `openrouter/` form. `resolveModel`: literal `import("@ai-sdk/<x>")` per provider
(and `import("@openrouter/ai-sdk-provider")`), `createGateway({ apiKey })` from `ai` for the gateway path (never for
`openrouter/` ids or bare ids), cached per id, `ModelUnavailableError` with `code`. `providerOptionsFor(provider,
level)` table (anthropic `effort` + `fallbacks: "default"`; openai `reasoningEffort` + `reasoningSummary: "auto"`;
google `thinkingConfig`; openrouter `reasoning: { effort }`; xai `reasoningEffort`; deepseek/mistral none; gateway:
upstream object keyed by vendor) with `// verify` comments on unverified names. `displayName`. Test `test/models.test.ts`
with `vi.doMock` for the SDK modules and an `ERR_MODULE_NOT_FOUND` case.

### 3. UPDATE `handler.ts` for providers

`DEFAULT_MODEL = "anthropic/claude-opus-5-5"`; `reasoning?: ReasoningLevel` (default `"low"`), `effort` deprecated
alias (wins when both set, anthropic only); GET `{ enabled, model, provider, agents }`; POST disabled → 503
`chat_disabled` with the availability message; import failure → 503 with the install hint (logged once). Tool parts
gain `providerMetadata` through `types.ts`, `validate.ts` (same shape/cap as reasoning), `wire.ts` (`toUIPart` sets
`callProviderMetadata`; `readParts` takes it from `tool-input-available`), `cloud.ts`. `package.json`: optional peers
+ devDependencies; `pnpm install`. `biome.json`: `@ai-sdk/*` and `@openrouter/*` patterns replace the single path.
Update `handler.test.ts`, `wire.test.ts`, `cloud-adapter.test.ts`.

### 4. UPDATE `vite/index.ts` and `cloud.ts`

Env forwarding predicate `/^(.*_API_KEY|AI_GATEWAY_.*|VERCEL_OIDC_TOKEN|WEB_AGENTS_.*)$/` + `envKeys?` option (the
secret guard from Phase 10 stays). Cloud adapter: `id?` option (default `"cloud"`), `label` default
`"<displayName(model)> (cloud)"` through a `get label()` once GET answers (`"Cloud"` before); keep `"Claude (cloud)"`
exact when the provider is anthropic and no model name is known, so the existing browser test and docs don't churn.

### 5. CREATE `packages/chat/src/server/web-agent.ts`; UPDATE `validate.ts`, `system-prompt.ts`, `handler.ts`

`toToolLoopAgentSettings(agent, { model, tools, path, base, maxOutputTokens, providerOptions, stopWhen })` →
`ToolLoopAgentSettings` (`instructions: buildSystemPrompt(base, path, agent?.instructions, agent?.agents.length > 0)`,
`tools: toToolSet(selectTools(agent, tools))` with no `execute`, `stopWhen: stopWhen ?? stepCountIs(1)`);
`toToolLoopAgent(...)` = `new ToolLoopAgent(settings)`. `chatRequestSchema.agent` (optional, AGENT_ID regex).
`buildSystemPrompt(base, path?, instructions?, delegation?)`; export `DELEGATION_NOTE`. Handler: `agents?` →
`flattenWebAgents` at create time; per POST resolve the agent (400 on unknown), `maxSteps = agent?.maxSteps ??
opts.maxSteps ?? 8`, per-agent `model` through `resolveModel`, `prepareAgent?(settings)` escape hatch, stream with
`createAgentUIStreamResponse({ agent: loop, uiMessages, sendReasoning: true, onError })`. Keep the budget-reached
behaviour (empty tool set + note). `webAgentsChatDev({ agents })`; `createVercelChatRoute({ agents, model?: string })`
(default `"anthropic/claude-sonnet-5-5"`). Tests: `web-agent.test.ts`, `handler.test.ts` (instructions in the system
prompt, note with sub-agents, unknown agent 400, `agent` as object 400, allow-list + regenerated delegates, per-agent
model, maxSteps precedence, GET lists agents, `prepareAgent`), `vite-plugin.test.ts`.

### 6. UPDATE client types, reducer, session, components, cloud adapter

`AgentRunRequest.agent?: WebAgent`; tool part `agent?: { id; messages: AgentMessage[] }`; `SessionAction` "part"
`within?`; `updateTools`/`toolPhase` recurse (`allToolParts`); `applyWithin`; `resumable` drops a running delegate.
`useAgentSession(adapter, { storageKey, agent })`: `session.tools = selectTools(agent, pageTools)`; `makeRequest(...)`
with `get tools()` filtered and `agent`; `callTool` intercepts delegates → `runDelegate(sub, call, ctrl, dispatchWithin)`
on the same adapter (one user message `task` + "\n\nContext: " + context; output = joined assistant text; `error` →
`toolError("failed", …)`; abort → `CANCELLED`; max steps without text → "The <id> agent stopped after N steps without
finishing."); recursion for sub-sub-agents. `<AgentChat agent>`; `ToolCallCard` renders a delegate as "<Name> agent"
with nested cards in `.wa-chat__nested`; `MessageList` parts renderer shared. `cloud.ts`: body `agent: req.agent?.id`,
`maxSteps = req.agent?.maxSteps ?? opts.maxSteps ?? 8`, strip nested runs from history. Tests: `reducer.test.ts`,
`cloud-adapter.test.ts`, new `agent-session.browser.test.tsx` (fake adapter branches on `req.agent?.id`; the nested run
calls a real `echoForm` tool; nested card rendered; Stop cancels both).

### 7. UPDATE `packages/local-agent`

`loop.ts:120`: `maxSteps = req.agent?.maxSteps ?? opts.maxSteps ?? 6`; `instructions = req.agent?.instructions.length
? req.agent.instructions.join("\n") : opts.instructions`; `delegation` flag to `prompt.ts` (appends the note).
`createLocalAdapter({ instructions })` stays as the fallback. Test `loop.test.ts`.

### 8. UPDATE example apps

`apps/ecommerce/src/agents.ts` (`checkout` + `shopper`, as in A0 §3–4; STORE_INSTRUCTIONS moved here),
`apps/flights/src/agents.ts` (`concierge`); delete both `src/tools/instructions.ts`; `Root.tsx` (`<AgentChat agent>`,
`createLocalAdapter()`), `vite.config.ts` (`webAgentsChatDev({ agents })`), `api/chat.ts`
(`createVercelChatRoute({ app, agents })`). Playground untouched. `.env.example`: `WEB_AGENTS_MODEL=anthropic/claude-opus-5-5`
plus commented `openai/…`, `deepseek/…`, `openrouter/anthropic/claude-opus-5.5` lines and the matching keys.

### 9. Docs, roadmap, CLAUDE.md, changeset

As listed in the approved plan A7 (+ `docs/guides/frameworks.mdx` with the Vite / Next.js / TanStack Start snippets
from A0 §6–9, and the providers table incl. OpenRouter in `docs/guides/chat.mdx`, `deploy.md`, `create-chat-handler.md`).
Roadmap: phase map rows 9–13, "Agent runtime" and "Default model" rows, the `@webmcp-agents/chat` contracts block.
CLAUDE.md: chat layout (`agent.ts`, `server/web-agent.ts`, `server/models.ts`), the agents gotcha ("instructions
live in the server registry; the browser sends only the agent id"). Changeset: minor chat, local-agent, vercel-api.

---

## TESTING STRATEGY

Unit (node): `agent.test.ts`, `web-agent.test.ts`, `models.test.ts`, `handler.test.ts`, `reducer.test.ts`,
`cloud-adapter.test.ts`, `wire.test.ts`, `vite-plugin.test.ts`, local-agent `loop.test.ts`.
Browser: `agent-session.browser.test.tsx`, existing `agent-chat.browser.test.tsx` unchanged.
Edge cases: delegate name clash with a page tool; sub-agent with an empty tool subset (model told it has no tools);
Stop during a nested run; page navigation during a nested run (`interrupted` result, parent continues); an unknown
agent id from a stale tab (400 surfaces as a session error with "Try again").

## VALIDATION COMMANDS

```bash
pnpm biome ci .
pnpm --filter @webmcp-agents/chat exec vitest run --project chat:node
pnpm --filter @webmcp-agents/chat exec vitest run --project chat:browser
pnpm --filter @webmcp-agents/local-agent test
pnpm --filter @webmcp-agents/vercel-api typecheck
pnpm turbo run check-exports
pnpm build && ! grep -q "@ai-sdk\|@openrouter" packages/chat/dist/index.js
pnpm check
```

Manual (ecommerce :5174, key in `.env.local`): `curl -s localhost:5174/api/chat` → `agents: ["shopper","checkout"]`;
"add a mug and check out with promo WELCOME" → shopper adds, then a "Checkout agent" card with nested `get_cart` /
`apply_promo` / `checkout` parked on the confirm click; move the mouse mid-run (cursor yields, run completes); Stop
during the nested run cancels both cards. Providers: `WEB_AGENTS_MODEL=openai/gpt-5.5` without the key → GET
`enabled:false` and the widget names the variable; `openrouter/anthropic/claude-opus-5.5` + `OPENROUTER_API_KEY` →
label "Claude Opus 5.5 via OpenRouter (cloud)" and one turn with a tool call; `AI_GATEWAY_API_KEY` only → gateway path.

## ACCEPTANCE CRITERIA

- [ ] `defineWebAgent` validates like `defineWebTool`; `WebAgent` is frozen data importable from `@webmcp-agents/chat/agent` in browser, Vite config and `api/chat.ts`
- [ ] The server builds an AI SDK `ToolLoopAgent` per request from the registered agent; instructions never come from the request body; unknown agent → 400
- [ ] Sub-agents appear as `delegate_to_<id>` tools; the nested run streams into a nested card; page tools still run under the cursor; Stop cancels everything
- [ ] The on-device loop honours `req.agent` (instructions, maxSteps)
- [ ] `provider/model` ids resolve across anthropic, openai, google, deepseek, xai, mistral, openrouter and the gateway; 503s name the env var; client bundle contains no provider SDK
- [ ] Example apps define `shopper`/`checkout` and `concierge`; docs, roadmap, CLAUDE.md, changeset updated; `pnpm check` green
