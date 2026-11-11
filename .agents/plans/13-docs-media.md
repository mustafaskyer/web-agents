# Feature: docs media — screenshots and short clips captured by Playwright, Phase 13

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Read first:
- `.agents/plans/08-docs-site-blume.md` (how the docs site renders `docs/`)
- `/Users/mustafaelsayed/.claude/plans/feature-and-some-fixes-nifty-goose.md` Part C

## Feature Description

The docs site and README have no images. Add a repeatable capture harness (`capture/`, Playwright's Chromium, not part
of `pnpm check`) that produces PNG stills (desktop 1280×800 @2x and Pixel 7) and short clips (WebM + MP4, one GIF for
the README) of the four example apps, the ghost cursor (typing, parked confirm, yield on mouse move, spotlight), the
devtools panel (Tools form, Timeline, Settings), the chat (tool card, nested sub-agent card, model picker) and the
shadcn blocks in the Next example. Media lives in `docs/media/` with size budgets; pages embed it with alt text.

## User Story

As a developer evaluating the project
I want to see the cursor work a page, the devtools panel and the chat before I install anything
So that I understand what the libraries do in ten seconds

## Problem Statement

No `*.png|gif|webm|mp4` exists in the repo; Playwright is set up per app with reduced motion and a `with motion`
template test (`apps/ecommerce/e2e/store.spec.ts:199-209`), but nothing captures. The agent-browser CLI's Chrome may
never fire rAF (CLAUDE.md), so captures must use Playwright's Chromium. Blume optimizes relative images (WebP) and
serves `<video>` files as is; `.mdx` needs closed void elements; images open in a lightbox unless `data-no-zoom`.
`ffmpeg` is installed locally (`/opt/homebrew/bin/ffmpeg`).

## Solution Statement

Part C of the approved plan: `capture/playwright.config.ts` (webServer array for :5173/:5174/:5175/:5176; `stills`
project with `reducedMotion: "reduce"`, `clips` project with `video: "on"` and `reducedMotion: "no-preference"`;
desktop + Pixel 7), `capture/*.capture.ts` specs reusing `apps/*/e2e/agent.ts` (`open`, `run`), `capture/encode.mjs`
(ffmpeg → WebM VP9 CRF 34 + MP4 H.264 ≤ 960 px, `hero.gif` 6 s / 12 fps / 800 px with palettegen; fails over 1.5 MB per
clip or 3 MB for the GIF), root `pnpm capture`, `docs/media/**` committed (PNG as captured), `docs/media/README.md`.
Chat captures run against a real model with `ANTHROPIC_API_KEY` in `apps/ecommerce/.env.local` (decision 2026-11-08)
and are skipped with a clear message when it is missing.

## Feature Metadata

**Feature Type**: Docs / tooling
**Estimated Complexity**: Medium
**Primary Systems Affected**: new `capture/`, `docs/media/`, every docs page in the table below, `README.md`,
`.gitignore`, root `package.json`, CLAUDE.md
**Dependencies**: `playwright` (already a devDependency of the apps; add at the root), `ffmpeg` on PATH (documented)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/ecommerce/playwright.config.ts`, `apps/flights/playwright.config.ts` (projects, reduced motion, webServer).
- `apps/ecommerce/e2e/agent.ts`, `store.spec.ts` (init script clearing `field-store:cart`; `with motion` block),
  `apps/flights/e2e/flights.spec.ts` (`/?latency=0`, `searchFromHome`, `selectFirst`).
- `apps/playground/src/App.tsx` (devtools mount; hotkey Alt+Shift+A yields the cursor: wait ~1 s before running tools).
- `packages/chat/src/components/DownloadCard.tsx` (picker from Phase 10), `ToolCallCard.tsx` (nested card, Phase 11).
- `apps/docs/blume.config.ts`; Blume "Links and images" docs in `node_modules/blume/docs/content/syntax.mdx` 153-185.
- Docs pages that take media: `docs/index.mdx`, `concepts/agent-cursor.mdx` (sections at 33, 48, 58, 74),
  `concepts/how-it-works.mdx` (56), `guides/devtools.mdx` (63, 78), `guides/chat.mdx` (78), `guides/agents.mdx`,
  `guides/on-device-agent.mdx` (55), `guides/ai-elements.mdx`, `getting-started/quickstart.mdx` (before 159),
  `examples/{playground,field-store,skyline,nextjs}.mdx`, `README.md` (hero slot after the first paragraph).

### New Files to Create

```
capture/playwright.config.ts
capture/tsconfig.json
capture/agent.ts                 re-export of the apps' e2e helpers (or a copy, if the import crosses tsconfig roots)
capture/cursor.capture.ts        typing clip, parked confirm still + clip, yield clip, spotlight still (ecommerce)
capture/devtools.capture.ts      Tools / Timeline / Settings stills (playground)
capture/chat.capture.ts          tool card still, sub-agent still, model picker still (ecommerce; skips without a key)
capture/examples.capture.ts      hero stills desktop + Pixel 7 for the four apps; Skyline booking clip
capture/encode.mjs               ffmpeg encode + budgets
docs/media/README.md             how to regenerate, budgets
docs/media/**                    generated assets (committed)
```

### Patterns to Follow

- Deterministic state: clear storage in `beforeEach`, `?latency=0` for Skyline, fixed viewport, `page.clock` not needed.
- Stills under reduced motion (the cursor snaps); clips with motion on, recorded with Playwright `video`, trimmed in
  `encode.mjs` from timestamps the spec writes to a sidecar JSON (`capture/out/<name>.json`: `{ start, end }`).
- `.mdx`: `<video autoplay loop muted playsinline data-no-zoom><source src="../media/x.webm" type="video/webm" /><source src="../media/x.mp4" type="video/mp4" /></video>`; images `![alt](../media/x.png)`.
- Alt text says what the frame shows; one-line captions under clips.

---

## STEP-BY-STEP TASKS

### 1. CREATE `capture/` harness
Config, tsconfig (mirrors `apps/*/tsconfig.node.json`), helpers, root script `"capture": "playwright test -c
capture/playwright.config.ts && node capture/encode.mjs"`, `capture/out/` in `.gitignore`, `playwright` at the root.

### 2. CREATE the four `*.capture.ts` specs
Each writes stills to `capture/out/stills/<name>.{desktop,mobile}.png` and clip timestamps to a sidecar; names are
stable (they are the file names in `docs/media/`).

### 3. CREATE `capture/encode.mjs`
Finds Playwright's `.webm` per test, trims to the sidecar range, encodes WebM + MP4 and `hero.gif`; enforces budgets;
copies stills to `docs/media/<area>/`.

### 4. Run `pnpm capture` locally (key present) and commit `docs/media/**`
Review every frame: no personal data, no stray devtools, cursor visible where intended.

### 5. UPDATE the docs pages and README
Per the table in the approved plan C2; `docs/media/README.md`; CLAUDE.md commands table (`pnpm capture`, "needs
ffmpeg"); README hero `hero.gif` + a devtools still.

---

## VALIDATION COMMANDS

```bash
pnpm capture                                     # locally, with ANTHROPIC_API_KEY in apps/ecommerce/.env.local
du -sh docs/media && find docs/media -size +1500k   # no clip over budget except hero.gif ≤ 3 MB
pnpm --filter @webmcp-agents/docs build && pnpm --filter @webmcp-agents/docs test   # blume validate: links + images
pnpm check
```

Manual: `blume preview` → clips autoplay muted and loop, stills open in the lightbox, mobile layout keeps images
within the gutter; the README renders the GIF on a GitHub-flavoured preview.

## ACCEPTANCE CRITERIA

- [ ] `pnpm capture` regenerates every asset from the running apps; budgets enforced
- [ ] Every page in the media table has its still/clip with alt text; README has a hero GIF
- [ ] Docs build and link validation pass; `pnpm check` green
