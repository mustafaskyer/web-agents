# Feature: `useAgentChat` (headless, AI SDK `UIMessage`), the `@webmcp-agents` shadcn registry (AI Elements), and a Next.js example, Phase 12

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

Read first:
- `.agents/plans/00-web-agents-roadmap.md` (contracts), `.agents/plans/11-agents-and-providers.md` (`defineWebAgent`,
  which the example shares between server and client), `.agents/plans/10-fixes-target-secrets-local-model.md`
  (`models()` / `selectModel`, rendered by the Model Selector)
- `/Users/mustafaelsayed/.claude/plans/feature-and-some-fixes-nifty-goose.md` Part D (the AI Elements review and
  fit table) and Part B2 (the Next.js example and the secret boundary)

## Feature Description

**AI Elements** (Vercel) is deprecated at the end of November 2026 and lives on as shadcn/ui's "AI Elements"
patterns (`ui.shadcn.com/docs/ai-elements`): compositions of shadcn primitives (Trace, Message, Bubble, Message
Scroller, Input Group, Item, Dropdown Menu, Code Block, shimmer) that an app copies in. There is no package. So the
chat leverages them the way AI Elements itself does:

1. **Headless core in the package.** `useAgentChat()` exposes a `useChat`-shaped API: AI SDK `UIMessage[]` (text,
   reasoning, `dynamic-tool` parts with AI SDK states), `status`, `sendMessage`, `stop`, `regenerate`, adapters, local
   models, agents, and `toolPhase(part)` for the one web-agents-specific state (a tool **parked on the page** waiting
   for the person's click, and a sub-agent's nested run). The built-in `<AgentChat>` is refactored onto it.
2. **A shadcn registry published from this repo** (`registry/`, built into `apps/docs/public/r`, namespace
   `@webmcp-agents`): `agent-chat` (block), `agent-tool`, `agent-subagent`, `agent-model-selector`, `agent-reasoning`.
   `pnpm dlx shadcn@latest add @webmcp-agents/agent-chat` gives a shadcn app a full chat over its own primitives.
3. **A Next.js 16 example** (`apps/nextjs`, "Field Store on Next", App Router, shadcn + Tailwind v4) that installs the
   registry block, shares `defineWebAgent` definitions between the route handler and client components, and shows the
   server/client secret boundary (`server-only` + React's `experimental_taintUniqueValue`).

## User Story

As a developer with a shadcn app
I want the agent chat rendered with the Tool, Reasoning, Message and Prompt Input patterns I already use
So that it matches my design system and I can edit the code

As a Next.js developer
I want a worked example of tools, agents and the chat under the App Router, with the key provably server-side
So that I can copy the shape with confidence

## Problem Statement

`<AgentChat>` is a closed widget with its own CSS; `useAgentSession` exposes internal `AgentMessage`s, not AI SDK
`UIMessage`s; there is no way to render the session with shadcn patterns; there is no RSC example.

## Solution Statement

Part D2 (hook), D3 (registry), B2 (Next example) of the approved plan.

## Feature Metadata

**Feature Type**: New capability + example app
**Estimated Complexity**: High
**Primary Systems Affected**: `packages/chat` (new `session/use-agent-chat.ts`, `adapter/wire.ts` `toUIMessages`,
`components/*` refactor), new `registry/` (root), `apps/docs` (`public/r` build), new `apps/nextjs`, docs, CI, Vercel
**Dependencies**: registry items depend on shadcn primitives (bare names) + `streamdown`, `ai`,
`@webmcp-agents/chat`, `@webmcp-agents/react`. Next example: `next` 16.4.x, `react` 19, `server-only`, `shadcn`,
`tailwindcss` 4, `@tailwindcss/postcss`. Confirm versions with `npm view` before pinning.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `packages/chat/src/adapter/wire.ts` 33-46 (`toUIPart`, `toUIMessages`: today only for request bodies).
- `packages/chat/src/session/use-agent-session.ts`, `reducer.ts` (status `idle | streaming | error`, tool states
  `running | awaiting-confirmation | done | error | cancelled`, `prompt`, nested `agent` from Phase 11), `resumable`.
- `packages/chat/src/components/*.tsx` (AgentChat, MessageList, ToolCallCard, Composer, Suggestions, AdapterSwitcher,
  DownloadCard): everything they read must come from `useAgentChat`.
- `packages/chat/src/components/Suggestions.tsx` `suggestionsFor`; `session/use-adapter-status.ts`.
- `apps/ecommerce/src/**` (catalog, tools, store, data): the Next example trims a copy of it.
- `apps/ecommerce/api/chat.ts`, `packages/vercel-api/src/index.ts` (route for Next).
- `apps/docs/blume.config.ts`, `apps/docs/package.json`, `apps/docs/turbo.json` (where `public/r` is built and served).
- `turbo.json` (new `registry:build` task; `apps/nextjs` build depends on `^build`), `pnpm-workspace.yaml`,
  `.changeset/config.json` (`ignore` the new app), `.github/workflows/ci.yml`.
- `apps/ecommerce/e2e/*` (smoke spec shape for the Next app), `apps/ecommerce/playwright.config.ts`.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- https://ui.shadcn.com/docs/ai-elements (index + migration table), pattern pages under
  `/docs/ai-elements/base/{chat,message,prompt-input,tool,reasoning,confirmation,suggestion,model-selector}` (each has a
  `.md` URL), `/docs/utils/shimmer`.
- https://ui.shadcn.com/docs/registry/getting-started and `/docs/registry/registry-item-json` (`registry.json`,
  `shadcn build --output`, `registryDependencies` forms, `files[].target` placeholders `@components/`, `@ui/`).
- https://ui.shadcn.com/docs/installation/next (and `/vite`, `/tanstack` for the frameworks guide).
- AI SDK `UIMessage`, `DynamicToolUIPart` states, `ReasoningUIPart` (`node_modules/.pnpm/ai@7*/.../index.d.ts`).
- Next.js 16 App Router: route handlers, `server-only`, `experimental.taint` + React `experimental_taintUniqueValue`
  (verify availability in the React build Next 16.4 bundles).

### New Files to Create

```
packages/chat/src/session/use-agent-chat.ts         useAgentChat(options): AgentChat
packages/chat/test/use-agent-chat.test.ts
packages/chat/test/use-agent-chat.browser.test.tsx
registry/registry.json
registry/tsconfig.json
registry/default/agent-chat/agent-chat.tsx
registry/default/agent-tool/agent-tool.tsx
registry/default/agent-subagent/agent-subagent.tsx
registry/default/agent-model-selector/agent-model-selector.tsx
registry/default/agent-reasoning/agent-reasoning.tsx
registry/test/registry.test.ts                      schema validation of built JSON (ajv), registryDependencies names
apps/nextjs/                                        next.config.ts, package.json, tsconfig.json, components.json, app/**, lib/env.server.ts,
                                                    agents.ts, tools/**, components/web-agents/** (installed block), e2e/store.spec.ts,
                                                    playwright.config.ts, vercel.json, .env.example
docs/guides/ai-elements.mdx, docs/examples/nextjs.mdx, docs/reference/chat/use-agent-chat.md
```

### Patterns to Follow

- The hook is the single state source: `<AgentChat>` must not read the reducer directly after the refactor.
- `UIMessage` stays canonical (no custom fields on parts): web-agents extras come from `toolPhase(part)`.
- Registry sources import via `@/registry/...` and `@/components/ui/...` as the shadcn docs require; `files[].target`
  = `@components/web-agents/<name>.tsx`.
- Confirmation stays on the page: the registry Tool renders "Confirm on the page: <prompt>" as an `Item` without
  approve/deny buttons (buttons would re-create the problem the cursor solves).
- Next example consumes built `dist` (Turbo `^build`), tool components are client components, Server Components render data.

---

## IMPLEMENTATION PLAN

### Phase 1: `useAgentChat` + `<AgentChat>` refactor (no visual change)
### Phase 2: registry sources + build + schema test
### Phase 3: `apps/nextjs` with the installed block, taint, e2e smoke
### Phase 4: docs, CI, Vercel config, roadmap

---

## STEP-BY-STEP TASKS

### 1. UPDATE `wire.ts` `toUIMessages` and CREATE `use-agent-chat.ts`

`toUIMessages(messages, { forRendering: true })`: stable part ids, tool `state` mapping (`running` /
`awaiting-confirmation` → `input-available`; `done` → `output-available`; `error` → `output-error` with `errorText`;
`cancelled` → `output-error` with the CANCELLED text), reasoning `state: "streaming" | "done"`, nested runs omitted
from the canonical message (exposed via `toolPhase`). `useAgentChat({ adapter | adapters, agent, agents, storageKey })`
returns the `AgentChat` object from the approved plan D2 (`messages`, `status` as AI SDK `ChatStatus` names,
`sendMessage`, `stop`, `regenerate`, `clear`, `tools`, `suggestions`, `adapters`/`adapter`/`selectAdapter`/`adapterStatus`,
`models`/`selectModel`, `agent`/`agents`/`selectAgent`, `toolPhase`). Adapter choice persistence moves here from
`AgentChat.tsx:49,83-91`. Tests: mapping per state, status mapping, `toolPhase` for parked / cancelled / delegate parts.

### 2. REFACTOR `components/*` onto `useAgentChat`

`AgentChat.tsx` calls the hook; `MessageList`/`ToolCallCard` take `UIMessage`s + `toolPhase`; `AdapterSwitcher`,
`DownloadCard`, `Suggestions`, `Composer` read hook fields. No visual change: `agent-chat.browser.test.tsx` passes as is.
Export `useAgentChat` + `AgentChat` type from `src/index.ts`.

### 3. CREATE `registry/`

`registry.json` (`$schema`, `name: "webmcp-agents"`, `homepage`, `items`). Items as in D3 with `registryDependencies`
(bare shadcn names: `message-scroller`, `message`, `bubble`, `input-group`, `button`, `dropdown-menu`, `tooltip`,
`scroll-area`, `trace`, `code-block`, `item`; local `./agent-tool.json` etc.), `dependencies` (`@webmcp-agents/chat`,
`@webmcp-agents/react`, `streamdown`, `ai`), `files[].target`. Sources: `agent-chat.tsx` (Message Scroller thread,
Message + Bubble per turn, `MessageResponse`-style Streamdown for assistant text, Prompt Input with the Model Selector
in its footer, Suggestion row, shimmer while streaming, Stop/Retry actions), `agent-tool.tsx` (Trace lines per state +
the parked `Item`), `agent-subagent.tsx` (nested messages from `toolPhase(part).agent`), `agent-model-selector.tsx`
(adapter menu, local-model menu with size + "on this device", optional agent menu), `agent-reasoning.tsx`.
`registry/tsconfig.json` with `paths` for `@/registry/*` and `@/components/ui/*` → the Next example's installed
primitives (so the sources typecheck). Root script `registry:build`: `pnpm dlx shadcn@latest build registry/registry.json
--output apps/docs/public/r`; `apps/docs/package.json` `prebuild` runs it; `apps/docs/public/r/` gitignored.
`registry/test/registry.test.ts`: every built JSON validates against the registry-item schema (fetch once and vendor
the schema file under `registry/test/`), every bare `registryDependencies` name is in a pinned list of shadcn items.

### 4. CREATE `apps/nextjs`

`pnpm dlx shadcn@latest init -t next` shape (Tailwind v4, Base UI variant), port 5176 (`next dev -p 5176`), package
`@webmcp-agents/example-nextjs`. Copy the ecommerce data/store/tools trimmed to home, product, cart, checkout; tool
components are `"use client"`. `agents.ts` (shopper + checkout, from `@webmcp-agents/chat/agent`). `lib/env.server.ts`
(`import "server-only"`, taint). `app/api/chat/route.ts` (`createVercelChatRoute({ app: "nextjs", agents })`).
`app/providers.tsx` (`"use client"`: `WebAgentsProvider` with `usePathname()`, the installed `AgentChat` block,
`installAgentVisuals()` in an effect, CSS imports). Install the block from the local build:
`pnpm dlx shadcn@latest add ./apps/docs/public/r/agent-chat.json` and commit the files under
`components/web-agents/`. `next.config.ts`: `experimental.taint: true` (verify), no `transpilePackages` needed.
Playwright smoke `e2e/store.spec.ts` (desktop + Pixel 7): server-rendered home lists tools after hydration,
`add_to_cart` runs, `checkout` shows the parked Item and completes on a real click, Model Selector lists adapters,
the checkout sub-agent renders a Subagent block, rendered HTML and `.next/static` contain no `sk-ant`.
`vercel.json` (Root Directory `apps/nextjs`), `.env.example`, `turbo.json` (`build` depends on `^build`), workspace +
changeset `ignore`, CI job, `pnpm dev` includes it.

### 5. Docs, roadmap, CLAUDE.md, changeset

`docs/guides/ai-elements.mdx` (what shadcn's AI Elements is now, install the namespace + block, what each block shows,
the fit table condensed, restyling since the code is theirs, the deprecation note and migration prompt for
`ai-elements` users), `docs/reference/chat/use-agent-chat.md`, `docs/examples/nextjs.mdx` (+ `examples/meta.ts`),
`docs/guides/frameworks.mdx` (Next section links the example), `docs/guides/deploy.md` (fourth project, env table),
README (Apps/Examples tables, "Bring your own UI" row), CLAUDE.md (`registry/`, `pnpm registry:build`, `apps/nextjs`,
port 5176, the "consumes dist" note), roadmap (phase 12 row, "Router (examples)" Next row, contracts: `useAgentChat`),
changeset (minor chat).

---

## VALIDATION COMMANDS

```bash
pnpm biome ci .
pnpm --filter @webmcp-agents/chat exec vitest run --project chat:node
pnpm --filter @webmcp-agents/chat exec vitest run --project chat:browser
pnpm registry:build && pnpm exec vitest run --root registry
pnpm turbo run build --filter=@webmcp-agents/example-nextjs...
pnpm --filter @webmcp-agents/example-nextjs e2e
! grep -r "sk-ant" apps/nextjs/.next/static
pnpm check
```

Manual: `pnpm dev` → :5176 renders the store server-side; the chat uses shadcn primitives (Trace tool lines, Bubble
messages, Input Group composer, Dropdown model menus); "add a mug and check out with promo WELCOME" → Subagent block;
the parked checkout item completes on a real click; a scratch `<Client secret={env.anthropicKey}>` throws the taint
error in dev (then remove it). `pnpm dlx shadcn@latest add http://localhost:4321/r/agent-chat.json` into a fresh
`shadcn init -t vite` app succeeds (the namespace works outside Next).

## ACCEPTANCE CRITERIA

- [ ] `useAgentChat` returns AI SDK `UIMessage`s and `ChatStatus`; `<AgentChat>` is built on it with no visual change
- [ ] `apps/docs/public/r/*.json` validates; `shadcn add @webmcp-agents/agent-chat` works in Next and Vite shadcn apps
- [ ] The Next example server-renders, shares `defineWebAgent` definitions, taints the key, passes its e2e smoke, and ships no key to the client
- [ ] Docs, README, CLAUDE.md, roadmap, changeset updated; `pnpm check` green
