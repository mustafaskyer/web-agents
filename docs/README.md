# WebMCP Agents docs

The source of the docs site (`apps/docs`, built with [Blume](https://github.com/haydenbleasel/blume)). Run it with
`pnpm --filter @webmcp-agents/docs dev` and open http://localhost:4321/docs (the site's home, `/`, is the landing page).

| Folder | |
|---|---|
| [`(get-started)/`](<(get-started)>) | The docs home (`index.mdx`, opened by the "Get started" heading: its own sidebar row is hidden) and `installation/`: the card grid and one page per framework (Vite, Next.js, TanStack Start, Astro, No framework). The parentheses group the pages in the sidebar without a URL segment. |
| [`build/`](build) | The path, in order: define a tool, tools with input, confirm before it runs, tools across your app, common tools, call a tool, define an agent, add the chat, call an agent, devtools |
| [`concepts/`](concepts) | Framework-free: how it works, the agent cursor, tool lifecycle, errors, writing tool descriptions |
| [`more/`](more) | On-device agent, shadcn chat blocks, declarative forms (the alternative to the Build path), polyfill, deploy |
| [`examples/`](examples) | The playground, Field Store, Skyline and Field Store on Next.js apps |
| [`reference/`](reference/README.md) | One page per public API, per package (the "Reference" tab) |
| `_examples/` | The code the pages show, as real files that type-check (`@webmcp-agents/docs-examples`, part of `pnpm check`) |
| `_partials/` | Prose shared by several pages (the framework cards) |

This README is left out of the site (`content.exclude` in `apps/docs/blume.config.ts`). Folders starting with `_` are
never routed.

## How these docs are written

The reader picks a framework once and every later page shows that framework's code. These conventions make that
work; `apps/docs/scripts/check-docs.mjs` (run by `pnpm --filter @webmcp-agents/docs test`, so by `pnpm check`) enforces
the ones it can.

### Views: the framework picker

- A page whose code differs by framework writes that code in `<View title="…">` blocks, **always all four, always in
  this order**: `Vite`, `Next.js`, `TanStack Start`, `Astro`. Prose outside the views is shared and written once.
  Blume shows one view behind a picker (styled as "Framework: …" in `apps/docs/theme.css`), saves a pick in
  `localStorage["blume-view"]` and applies it on every page written in views. A saved choice applies only where a
  view with exactly that title exists, so a typo in a title breaks the chain: the check verifies the titles.
- Arriving with `?view=Next.js` shows that view but saves nothing. The installation pages (one per framework, no
  views) save the choice with `<RememberFramework name="Next.js" />` (`apps/docs/components/docs/remember-framework.astro`,
  registered in `apps/docs/components.ts`), and their "Next" card links `/build/define-a-tool?view=<framework>` (not a repeat of the pager, which goes to the
  next installation page; the card's arrow sits at its right edge, `apps/docs/theme.css`) so
  the link works even when storage is off. Links between Build pages carry nothing: the saved choice does it.
- Pages with no framework-specific code (Concepts, Reference, the installation pages themselves) have no views and
  no picker. "No framework" readers get `installation/no-framework`, then Concepts and the Reference.

### Tabs: the hook or the definition

- Tools and agents each have two forms, and a page that teaches one shows both, in `<Tabs>`, **hook first**:
  `useWebTool` then `defineWebTool` (`syncKey="tool-api"`), `useWebAgent` then `defineWebAgent`
  (`syncKey="agent-api"`). The tab titles are exactly those API names, so a pick in one group switches every group
  with the same key on the page (Blume does not remember it across pages, so every page opens on the hook).
  `hash={false}` keeps the tabs out of the URL, which the framework view owns.
- A code block loses its header inside a tab, so each include in a tab has the file's name on the line above it, in
  bold code: ``**`src/tools/clear-cart.ts`**``.
- Where the code differs by framework, the tabs go inside each `<View>` (Define a tool, Call a tool, Call an agent);
  where it does not, one group stands alone (Define an agent's "Use it"). One line above the group says how to pick:
  the hook for a component (its state, its lifetime), the definition for a module of its own (the whole app, a
  store, a file a server can import). Prose after the group is written for both.
- The agent tab is titled `defineWebAgent` even where its code is `agent.invoke`: `invoke` belongs to the defined
  agent, and the title names what the reader wrote.

### Examples live in `_examples/` and compile

- Every complete example is a real file under `docs/_examples/<framework>/…` (`vite/`, `nextjs/`, `tanstack-start/`,
  `astro/`, `no-framework/`), or under `docs/_examples/shared/` when it is the same in every framework. Each folder
  has a `tsconfig.json` with that framework's `@/` alias (`src/` in Vite, TanStack Start and Astro; the root in
  Next.js) that falls back to `../shared`, and `@/components/ui/*` resolves to the shadcn/ui copies in
  `examples/ui/src/components` (the examples' shared `@webmcp-agents/examples-ui`). `pnpm --filter @webmcp-agents/docs-examples typecheck` runs them all against the
  packages' source. Biome formats the folder at 72 columns, the widest line a docs code block shows without a
  sideways scroll; comments are yours to keep short (the check measures every line).
- A component that is the same everywhere lives once in `shared/components/`, and Next.js gets a copy in
  `nextjs/components/` that is the shared file with `"use client";` and a blank line on top (the check verifies the
  two are identical). Vite, TanStack Start and Astro views include the shared file.
- A page pulls a file in with an include on its own line, titled as the reader has it:
  `<include meta='title="components/clear-cart.tsx"'>/_examples/nextjs/components/clear-cart.tsx</include>`.
  Line highlights go in the same meta (`title="app/layout.tsx" {4,13-15,17}`); a block that is long for its page adds
  `expandable`. Includes work inside `<View>` and in `.md` reference pages alike. A prop of an include cannot build
  the path of a nested include (Blume expands nested includes before it substitutes props), so a partial cannot stand
  in for a block of four views: write the four `<View>` blocks in the page.
- An inline fence is for an excerpt: at most 12 lines of `ts`/`tsx`/`js`, no `export`, no `"use client"`. Anything
  longer, or anything that is a file, is an include. A fence that shows a file (any language) carries the file name
  after the language (` ```astro src/pages/index.astro `). A titled excerpt with `// [!code highlight]` lines is the
  way to show what to add to a file the reader already has and the docs do not own (`vite.config.ts` on Add the
  chat, the TanStack Start root route on its installation page).
- **A file the reader edits again later in the path** (the provider gains `tools` on Build 4 and the chat on Build 8)
  is one real file per stage, a sibling named with the stage (`vite/src/main.catalog.tsx`, `main.chat.tsx`,
  `nextjs/app/providers.catalog.tsx`, `providers.chat.tsx`, the same under `tanstack-start/` and `astro/`), included
  under the name the reader has (`title="src/main.tsx"`) with the new lines highlighted. The installation pages keep
  the first stage (`main.tsx`, `providers.tsx`).
- **App modules that are the same everywhere** live in `shared/` too: `shared/tools/` (the catalog, `index.ts`, and
  one file per tool), `shared/lib/cart.ts` (the stand-in store), `shared/agents.ts`. A file a server reaches (the
  catalog and the agents, imported by `/api/chat` and by `vite.config.ts`) imports with **relative** paths and takes
  `defineWebTool` from `@webmcp-agents/core`, never React: the Vite config and a Vercel function do not resolve the
  `@/` alias. Components import them as `@/tools`, `@/agents`, `@/lib/cart`, which falls back to `shared/`. The Vite
  tsconfig sets `rootDirs: ["./src", "../shared"]` so `api/chat.ts` can import `../src/agents` as the reader writes it.
- Server files: `vite/api/chat.ts`, `nextjs/app/api/chat/route.ts`, `tanstack-start/src/routes/api/chat.ts` (real
  `@tanstack/react-start` types: `routeTree.gen.ts` imports it for the `server` route option), `astro/src/pages/api/chat.ts`
  (the Astro tsconfig uses `astro/client` types for `astro:env/server`). The Vite, TanStack Start and Astro tsconfigs
  include `node` types, because the chat's server entry reads `process`.
- Example style: on the Build pages, shadcn/ui components and React Hook Form (Define a tool says once, at the top, that
  both are optional; each page installs exactly the components and libraries its own examples import, with a
  `package-install` fence before its first example), never plain HTML; on the installation pages and the No framework page, plain elements, since
  installation is about the framework only. One prop per line where it helps, blank lines between logical groups; the
  comments `// An agent calls this.` and `// A person clicks this.` (or `submits`) where both callers appear; `@/`
  imports on the Build pages (shadcn/ui's setup uses that alias); relative imports on the installation pages of Vite,
  TanStack Start and Astro, whose starters may not set it up (the tsconfigs' `rootDirs` let them reach `shared/`); a
  tool's `description` says what it does, when to use it, what it needs first and what comes next.
- To add an example: write the file in the right folder, run the typecheck, then include it. A new framework file
  that a tsconfig does not reach yet (a route, a server file) goes in a folder the tsconfig lists or in a new
  `include` entry; TanStack routes also need a line in `tanstack-start/src/routeTree.gen.ts` (the stand-in for the
  generated route tree).

### The installation pages

Five pages, the same six `##` headings in this order, inside `<div class="install-steps">` (numbered 01–06 by
`apps/docs/theme.css`; not Blume's `<Steps>`, whose body drops a code block's file name): **Create a project**,
**Install the packages**, **Add the styles**, **Add the provider**, **Add your first tool**, **Run it**. Each step is one
or two sentences and one command (a `package-install` fence, which Blume expands into a tab per package manager) or
one file with its name; "Skip this if you already have …" where it applies. **Create a project** runs the framework's
own starter (`npm create vite@latest`, `npx create-next-app@latest`, `npx @tanstack/cli@latest create`,
`npm create astro@latest` then `npx astro add react`). **Add your first tool** shows `clear-cart.install.tsx`
(`shared/components/`, with its Next.js copy): the `ClearCart` of Define a tool with a plain `<button>`. Nothing in
installation installs or mentions shadcn/ui: it is optional, introduced once at the top of Define a tool. The chat is
not part of installation. The page ends with `## Next` and one card to `/build/define-a-tool?view=<framework>`. The
check verifies the headings, the `RememberFramework` line, the "Next" link, and that neither the page nor a file it
includes mentions shadcn or imports `@/components/ui/*`.

### A Build page

The five parts, in order: a one-paragraph definition; `## A complete example` (four views of one file, or of the two
files a step touches); two or three
`##` sections with the things to know, shared prose, each with a small shared snippet or a four-view example;
`## Try it` (one line to run from the devtools or the console); `## Options you'll use most` (a short table linking
to the reference). No `## Next` card: Blume's Previous / Next pager at the foot of every page already links the next
page of the path, and a card to the same page says it twice. Only the path's last page (Devtools), whose pager leaves
the path, ends with `## Next` and the places to go from here. Titles stay as the plan names them; the sidebar
numbers come from each page's `sidebar.label` ("3. Confirm before it runs"). Prose is short and direct: one or two
sentences per step, second person, no filler. Where the framework only changes a word (the env prefix to avoid:
`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`), shared prose names all of them rather than adding views. Shared prose never shows
`import.meta.env` or `process.env`: those belong in a view. When "Try it" needs something a later page adds (a model
for an agent), it says so and says what you will see. The check verifies the first and the last two headings, the
views, and that no `## Next` repeats the pager.

### A reference page

`.md`, relative links (`../core/define-web-tool.md`, `../../build/define-a-tool.mdx`), the title in the `# H1`, one
sentence under it, then exactly these `##` sections in this order, none renamed: **Import**, **Example** (complete:
every import and name declared, an include of a compiled file), **Options** (functions and hooks) or **Props**
(components) or **Input** and **Answer** (the ready-made tools), **Returns**, **Notes** (edge cases, one line each),
**See also** (the Build page that teaches it first, then related APIs). The Options/Props table has the columns
`Name | Type | Default | Description`, one row per option, none skipped: the check reads each exported option type
(`WebToolConfig`, `UseWebToolOptions`, …; the list is `OPTION_TYPES` in `check-docs.mjs`) with the TypeScript compiler
and requires a row per property. A description says what the option is for, not just what it is; the default is a
value, `required`, or "not said" for a flag. Subsections (`###`) are allowed inside a section.

### Links

Pages link root-absolute as if mounted at `/` (`/build/add-the-chat`); Blume adds `/docs`. Reference pages link
relative `.md`/`.mdx` paths so they also read on GitHub; a path into `(get-started)` is wrapped in angle brackets
(`[Installation](<../(get-started)/installation/index.mdx>)`). Old routes redirect: `redirects` in
`apps/docs/blume.config.ts`, mirrored in `apps/docs/vercel.json`. Anything outside `docs/` that hard-codes a docs route
(`apps/docs/lib/site.ts`, the landing's data files, the package READMEs, the root README, CLAUDE.md) is updated with
the route.

### Concepts

Framework-free: no `<View>`, no setup code, no framework file names. A Concepts page says how something works and why, in
short sections of one idea each, with a diagram (` ```mermaid `), a generated clip from `docs/media/` or a table where
that is clearer than prose. Setup lives in Installation and Build: link there. Each page has `related:` front matter
(two or three sibling pages or the Build page it explains). Pages: how it works, the agent cursor, tool lifecycle, errors,
writing tool descriptions (the "write a good description" guide: what it does and answers, when to use it, what it needs
first, what comes next; parameters say where a value comes from, with an example).

### Security

How to lock `/api/chat` to the page: an overview with the threat model, the complete locked-down route in four views
(`_examples/<framework>/…/chat.secure.ts`, `route.secure.ts` in Next.js, and `shared/allowed-tools.ts`) and a go-live
checklist, then one page per layer (sessions, tool allowlist, Turnstile, limits and budgets). Shared prose; a `<View>`
block only where the code differs by framework. Each page says what its layer stops and what it doesn't. A change to
`createChatHandler`'s `session` / `tools` / `requireAgent`, the cloud adapter's `sessionHeaders` or
`@webmcp-agents/vercel-api`'s guards updates these pages with the reference.

### More

Guides that sit beside the path. Add the four `<View>` blocks (Vite, Next.js, TanStack Start, Astro) only where the page
shows code that differs by framework: the on-device guide (the bundler's worker settings). Otherwise keep the page
framework-free (the polyfill page is: the provider loads it, and `polyfill={false}` is the same prop everywhere). State
honestly which framework a page's code has been run on; a view nobody has run says so in one line. `declarative-forms` is the only page that teaches
`<form toolname>`, the form attributes and `useToolAnswer`, and says in its first lines that it is the alternative to the
Build path. `deploy.md` stays Markdown: it names the four frameworks under `###` headings instead of views, so a reader
sees every deploy story at once and the code comments that point at `docs/more/deploy.md` stay true.

### Examples

One page per example app (`examples/playground`, `examples/ecommerce`, `examples/flights`, `examples/nextjs`), written from the app's
README and source, which are the truth: what it shows, a screenshot or clip from `docs/media/examples/`, how to run it,
its tools in a `Tool | Where | On | Confirm` table, and "Patterns worth copying", each bullet linking the Build or Concepts
page that teaches it. When an app's README changes, change its page.

### Front matter, sidebar and related pages

- Every page has a `title` and a one-line `description` (quote the description when it contains `: `). Reference pages
  take the title from the `# H1`; their `description` is the first sentence under it. A README under `reference/` also
  sets `slug: reference/<package>`.
- Sidebar order is `pages` in the folder's `meta.ts`; a page's sidebar name is `sidebar.label` when set, else its title.
  Build pages number theirs ("3. Confirm before it runs").
- `related:` (root-absolute paths) shows cards at the foot of the page. Use it where a page has an obvious sibling.
- Media (`docs/media/**`) is generated by `pnpm capture`: use what exists, never hand-edit. `docs/media/README.md` is not a
  page (`content.exclude`): link to nothing in it.
- The brand is "WebMCP Agents" in prose; package names stay lowercase (`@webmcp-agents/core`). Write short sentences in
  the second person; a code block that shows a file carries its name.

### Add a page in ten minutes

1. **Pick the section.** A step in the path goes in `build/`, a "why" in `concepts/`, an optional topic in `more/`, an
   app in `examples/`, an API in `reference/<package>/`.
2. **Create the file** with front matter (`title`, `description`, `sidebar.label` if the title is long) and list it in the
   folder's `meta.ts` `pages` (a reference page needs no entry: its folder's `meta.ts` sets only the package's title and order, and the page list builds itself).
3. **Write it on the template** for that section (above). Code that is more than an excerpt goes in
   `docs/_examples/` first: write the file, run `pnpm --filter @webmcp-agents/docs-examples typecheck`, then `<include>` it.
4. **Link it**: from the page before it (its place in `meta.ts` gives the pager), from `related:` of its siblings and, for an API, from the Build page
   that teaches it. Renaming or moving a page adds a `redirects` entry in `apps/docs/blume.config.ts` and the same rule in
   `apps/docs/vercel.json`.
5. **Run `pnpm --filter @webmcp-agents/docs test`** (link validation plus the docs check). Before you finish, `pnpm check`
   (stop `pnpm dev` first: `blume build` refuses while `blume dev` runs), or `pnpm exec blume build --isolated` in
   `apps/docs` beside a running server.
6. **Look at it**: open the page on http://localhost:4321/docs in light and dark, once in each framework if it has views,
   and at phone width.

### What the docs check enforces

1. A page with views has exactly the four titles, in order, in every block of views.
2. An installation page has the six step headings in order, its `RememberFramework`, and a "Next" link carrying
   its framework. A Build page starts with `## A complete example`, ends with `## Try it` and `## Options you'll use
   most` (Devtools, the last, then `## Next`), has views, and has no `## Next` card repeating the pager.
3. A reference page on the template has the template's sections in order (`REFERENCE_NOT_MIGRATED` is empty, like
   `GUIDES_NOT_MIGRATED`).
4. On a migrated page, a code block that shows a file has its name, an inline `ts`/`tsx`/`js` fence is at most 12
   lines, and every include points into `/_examples` (with a title) or `/_partials` (`GUIDES_NOT_MIGRATED` lists guide pages not yet
   on the pattern; it is empty, and a page is added there only while it is being migrated).
5. Retired teaching (`toolname` on a control, the provider's `pathname`/`global`/`routes`/`context` props,
   `ctx.context`, `agent.run(`, raw `annotations: {`) appears only on `more/declarative-forms`, on the reference pages
   of those earlier forms, under a heading that names the earlier form, or in a sentence that calls it earlier,
   legacy or declarative.
6. Every property of an exported option type has a row in its reference page's Options/Props table (migrated pages).
7. `docs/_examples`: no line over 72 columns; a `nextjs/` copy equals its `shared/` counterpart plus `"use client"`.
