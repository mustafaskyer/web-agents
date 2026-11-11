# Plan: docs that start with your framework and stay in it

## Context

The docs describe the new API correctly, but they are hard to walk through:

- **The framework comes last.** "Frameworks" is the fourth sidebar group. The quickstart silently assumes Vite, and so
  do the chat, agents, devtools and on-device guides (`vite.config.ts`, `import.meta.env.DEV`, `VITE_` prefixes).
- **The choice is not remembered.** A Next.js developer reads the Next.js page, then every other page shows Vite code.
- **Setup is told six times.** Install, provider, polyfill, catalog and `.env.local` are repeated across the
  quickstart, four framework pages and several guides, each slightly different.
- **There is no path.** After setup the reader faces twelve guides in a flat list with no order.
- **Reference pages are uneven.** Sections vary by page (`Options`, `Props`, `Parameters`, `Input`), about 24 pages
  have no options table in the common shape, and examples are fragments that use undeclared names.
- **Examples were never compiled.** The last docs pass said so itself.

**What the user asked for (2026-11-10):** start with "get started with Vite / TanStack / Next.js / Astro"; save the
reader's framework and show every later page in it; make the docs read as steps (install, then define a tool, then
define an agent, …); every API with a clear example and a clear description of each prop; friendly, fast to find
things, fast to try things; a full refine of content, reference and links. Learn from shadcn/ui, Tailwind and Mastra.

**What we borrow, having read those three sites:**

| From | Pattern |
|---|---|
| shadcn/ui | A "Choose your framework" card grid, then one install page per framework with the same skeleton; package-manager tabs on every command; file names on code blocks; "if you already have X, skip this step". |
| Tailwind | Numbered steps (01–06) with identical titles across frameworks, one sentence and one command or file per step; only the configuration step differs. |
| Mastra | Concept pages that do not fork per framework; a "what next" table of goal → page; reference pages that show an example before the signature. |

## The key mechanism: the docs framework already remembers a choice

Blume (the docs framework in `apps/docs`) has a built-in `<View title="…">` block. A page written with views shows
one at a time behind a picker at the top of the page, **remembers the pick across pages** (`localStorage`,
key `blume-view`) and reflects it in the URL (`?view=Next.js`). Prose outside a view shows for everyone, and headings
inside hidden views drop out of the table of contents. Nothing in the repo uses it yet.

So "save my framework and show me my docs" needs no custom router and no duplicated page trees:

- One page per topic. Shared explanation is written once; only the code that differs sits in four views named exactly
  **Vite**, **Next.js**, **TanStack Start**, **Astro**.
- The reader picks a framework on the installation page; every link forward carries the choice, and the picker on
  each page lets them change it.

Two more built-ins we start using: the `package-install` code fence (one command becomes npm / pnpm / yarn / bun
tabs) and `<include>` partials with parameters, so a snippet shared by several pages lives in one file.

## What the reader gets

### The sidebar

```
Get started
  Introduction            what it is in one screen, then: Choose your framework
  Installation            the card grid: Vite · Next.js · TanStack Start · Astro · No framework
    Vite
    Next.js
    TanStack Start
    Astro
    No framework

Build                     the path, in order; each page ends with "Next"
  1  Define a tool
  2  Tools with input (forms)
  3  Confirm before it runs
  4  Where a tool is on (catalog, match, availableTools)
  5  Common tools
  6  Call a tool
  7  Define an agent
  8  Add the chat
  9  Call an agent
  10 Devtools

Concepts                  framework-free: How it works · The agent cursor · Tool lifecycle · Errors ·
                          Writing tool descriptions
More                      On-device agent · shadcn chat blocks · Declarative forms · Polyfill · Deploy
Examples                  Playground · Field Store · Skyline · Field Store on Next.js
```

The **Reference** header tab stays, one group per package.

### An installation page (the same six steps in every framework)

```
Install in a Next.js app

01  Create a project                 skip if you have one
02  Install the packages             [npm] [pnpm] [yarn] [bun]
03  Add the styles                   app/layout.tsx (import "@webmcp-agents/core/cursor.css")
04  Add the provider                 app/providers.tsx   ("use client")
05  Add your first tool              components/clear-cart.tsx
06  Run it                           open the devtools, press Run, watch the cursor

Next: Define a tool →                (carries Next.js forward)
```

Step titles are identical across the five pages. Only what truly differs changes: file paths, `"use client"`, how
`cursor.css` is loaded, the polyfill guard, where the provider lives. Each step is one or two sentences and one
command or one file with its file name on the block. The chat and its `/api/chat` route are not in installation;
they are step 8 of the path, where each framework's route is shown in its view.

### A page on the path

```
Define a tool                                        Framework: [ Next.js ▾ ]

One paragraph: a tool is `execute`, plus an optional `target`.

  ┌ Next.js ─ components/clear-cart.tsx ────────────────────┐
  │ "use client";                                           │   ← only this block is per framework
  │ export function ClearCart() { … useWebTool({ … }) … }   │
  └─────────────────────────────────────────────────────────┘

How the cursor finds the button          (shared prose, shared small snippets)
Give it a title that matches             …
When the control depends on the call     …

Try it          one line to run from the devtools
Options you'll use most    a short table, linking to the full reference
Next: Tools with input →
```

Every Build page has the same five parts: what it is in a sentence, a complete example in your framework, the two or
three things to know, "Try it", and "Next".

### A reference page (one template for all 81)

```
# useWebTool

One sentence: what it does and when you reach for it.

## Import
## Example            complete: every import and name declared; runs as pasted
## Options            Name | Type | Default | Description     one row per option, none skipped
## Returns            Name | Type | Description
## Notes              edge cases, each one line
## See also           the Build page that teaches it, related APIs
```

Rules: the example comes before the tables; every option has a type, a default (or "required") and a description
that says what it is for, not just what it is; the same section names on every page (`Options` for functions and
hooks, `Props` for components, `Input` and `Answer` for the ready-made tools).

## How it is built

- **Views.** Framework code sits in `<View title="Vite|Next.js|TanStack Start|Astro">` blocks, always all four, always
  in that order (a saved choice only applies where a view with that exact title exists). "No framework" readers get
  the `createWebAgents` page and the Concepts and Reference sections, which have no views.
- **Carrying the choice from installation.** Installation pages are separate pages (one per framework), so their
  "Next" links and the cards on the Introduction use `?view=<framework>`. Step A verifies that arriving with
  `?view=` stores the choice; if Blume only stores it on a manual pick, a ten-line island in `apps/docs/islands/`
  writes `blume-view` on the installation pages.
- **Examples are real files that compile.** Example code moves to `docs/_examples/<framework>/…` (folders starting
  with `_` are not routed) and is pulled into pages with `<include>`. A `docs/_examples/tsconfig.json` type-checks
  them in `pnpm check`, with the same path mapping trick `registry/tsconfig.json` already uses to resolve shadcn
  components from `apps/nextjs`. A docs sample can no longer drift from the API.
- **Shared snippets once.** The catalog, the agent, `.env.local` and the "where secrets live" table become partials
  with parameters (file path, env prefix) instead of six hand-kept copies.
- **A docs check** (`apps/docs/scripts/check-docs.mjs`, run by the docs app's `test` beside `blume validate`):
  every page with views has exactly the four titles; every reference page has the template's sections in order;
  file-backed code blocks have a title; none of the retired teaching (`toolname=` on a button, `pathname=` on the
  provider, `ctx.context`, …) appears outside the declarative-forms page and "earlier form" sections; and every key
  of `WebToolConfig`, `WebAgentConfig`, `WebAgentsProviderProps` and the other exported option types appears in its
  reference page's Options table (read with the TypeScript compiler API, so a new option cannot ship undocumented).
- **Links.** Old routes redirect to new ones (`/docs/getting-started/quickstart` and `/docs/frameworks/*` →
  `/docs/installation/*`, guides → their Build page). Everything that hard-codes a docs route is updated:
  `apps/docs/lib/site.ts` (the landing's `open_docs` tool and Quickstart link), `faq-data.ts`, `demos-data.ts`,
  `site-chrome.tsx`, the package READMEs, the root README and CLAUDE.md's docs section.
- **Honesty about what is tested.** A page whose setup no example app runs (TanStack Start, Astro's chat route) says
  so in one line at the top, as today, until a real app backs it.

### Where today's pages go

| Today | Becomes |
|---|---|
| `getting-started/quickstart`, `frameworks/{vite,nextjs,tanstack-start,astro}`, `getting-started/without-react` | `installation/` (index + five pages) |
| `concepts/tools`, `guides/forms`, `guides/common-tools`, `guides/invoke`, `guides/agents`, `guides/chat`, `guides/devtools` | the ten Build pages (content split by task, not by package) |
| `concepts/{how-it-works,agent-cursor,tool-lifecycle,errors}`, `guides/tool-descriptions` | Concepts, trimmed of setup and framework code |
| `guides/{on-device-agent,ai-elements,declarative-forms,polyfill,deploy}` | More (views added where they assume Vite) |
| `reference/**` | same files, one template |

## Execution: delegated, gated here

As agreed, implementation runs on Fable, Opus and Sonnet under this session's management; I review each step's
diff, re-run the checks and look at the result in the browser before the next starts. The app does not let me start
a session from an automated turn, so steps run as background agents on those models unless you start a card
yourself. One writer at a time (they share the docs build folder). Nothing is committed without your word.

| Step | Model | Scope | Gate before the next |
|---|---|---|---|
| A. Foundation and one full slice | Fable | New sidebar and folders with redirects; views verified end to end (pick on install, carried to the next page, changed from the picker, survives reload); `package-install`; the `_examples` type-check; the docs check script; and one finished slice as the pattern: Introduction, Installation (index + five pages), "Define a tool", and the `define-web-tool` + `use-web-tool` reference pages in the template | I read the slice as a Next.js developer and as a Vite developer in the browser, light and dark, desktop and phone; `pnpm check` |
| B. The rest of the path | Opus | Build pages 2 to 10 in the slice's pattern, with compiled examples in all four frameworks | Each page in two frameworks in the browser; `pnpm check` |
| C. Reference | Sonnet | The remaining reference pages to the template, each checked against the source types | The docs check passes with no exceptions list; I sample ten pages against the code |
| D. Concepts, More, Examples, links | Sonnet | Trim and re-link those sections; landing, READMEs and CLAUDE.md links; redirects verified | `blume validate`, a crawl of every old URL, final read-through |

## Verification

- `pnpm check` (stop any docs dev server first): the docs build, `blume validate` for links and anchors, the new docs
  check script, and the type-check of `docs/_examples/**`.
- In the built-in browser on `http://localhost:4321/docs`:
  - Pick Next.js on Installation, follow "Next" through all ten Build pages: every code block is the Next.js one,
    with no Vite file names or `import.meta.env`. Repeat for Vite, TanStack Start and Astro.
  - Change the framework from a page's picker, reload, open a different page: the choice holds.
  - Open a Build page with no saved choice: it shows Vite and the picker.
  - Package-manager tabs switch on every install command.
  - Light and dark, desktop and the phone preset: the picker, steps and code blocks stay readable.
- Every old route in the table above redirects to its new page (a scripted crawl).
- From the landing: the Quickstart link and each `open_docs` chip land on the right new page.
- Ten reference pages sampled against `packages/*/src`: every option present, defaults correct, the example runs
  when pasted into the matching example app.
