# @webmcp-agents/docs

The website: one [Blume](https://github.com/haydenbleasel/blume) site with the landing page at `/` and the docs under
`/docs`. The docs are the repo's [`docs/`](../../docs/README.md) folder (**edit content there**, not here); the landing
page lives in this app.

```bash
pnpm --filter @webmcp-agents/docs dev        # http://localhost:4321 (builds the packages first), reloads on edits
pnpm --filter @webmcp-agents/docs build      # static site in dist/ (search index, llms.txt, raw .md copies)
pnpm --filter @webmcp-agents/docs test       # blume validate (every link and anchor) + scripts/check-docs.mjs (the docs conventions)
pnpm --filter @webmcp-agents/docs typecheck  # tsc over the landing page's components
```

## The landing page and the Demos page

`pages/index.astro` (`/`) and `pages/demos.astro` (`/demos`) are Blume custom pages with their own documents. Each
hydrates one React island (`components/landing/landing.tsx`, `components/landing/demos.tsx`) and takes three things from
Blume so the site reads as one: the fonts, the favicon and the theme (the choice a reader makes anywhere follows them).
Both share one header and footer (`site-chrome.tsx`: Demos, How it works, FAQ, Docs, Quickstart, GitHub). The docs header
links back with a Demos action (`blume.config.ts`); Blume puts it under `basePath`, so `pages/docs/demos.astro` redirects
`/docs/demos` to `/demos`.

- Home: floating navbar, hero (a title whose verb retypes itself, `typed-words.tsx`, over the tools to try, grouped by
  Watch, Read and Do, `try-it.tsx`), three steps (a tool with `useWebTool`, a tool on a React Hook Form form, the
  provider with an agent and the chat: `steps-data.ts`, highlighted by Shiki at build time with the docs' code themes, each with a copy button), FAQ
  (`faq-data.ts`) with a docs search, footer.
- Demos: one section per example app (`demos-data.ts`): what the agent does, the clip in a browser frame
  (`demo-frame.tsx`), the calls it made as code, and links to the example's docs page and source. A frame is as wide as
  the header unless the window is too short to show all of it.
- The sections are [OpenDesigns](https://designs-hub.mustafaskyer.workers.dev/docs) blocks in
  `components/opendesigns/**` over shadcn primitives in `components/ui`. The blocks are ours to edit. To add one:
  `OPENDESIGNS_TOKEN=<your token> pnpm dlx shadcn@latest add @opendesigns/<block>` here (the registry is declared in
  `components.json`; the token stays out of the repo).
- `landing.css` is the stylesheet of both pages, a second Tailwind entry beside the one Blume generates: shadcn's tokens
  share names with Blume's, so the two never meet in one sheet.

### The clips

`public/demo/<demo>.{webm,mp4,jpg}` (committed; the jpg is the poster, the clip's first frame) are recorded with
[agent-browser](https://github.com/vercel-labs/agent-browser) driving the example's own tools, at 1600×800, 30 fps,
then encoded to WebM (VP9) and MP4 (H.264), about 1.5 MB per pair at most. Both use the same person and stay offline (the
apps' mock data): Mustafa Elsayed, mustafa@mail.test, Riyadh.

```bash
pnpm --filter @webmcp-agents/example-flights dev      # :5175, then:
apps/docs/scripts/record-demo.sh skyline-booking      # Riyadh → Dubai, book_flight parks until the click
pnpm --filter @webmcp-agents/example-ecommerce dev    # :5174, then:
apps/docs/scripts/record-demo.sh field-store-checkout # a tote to a Riyadh address, checkout parks until the click
```

agent-browser's Chrome has native WebMCP; the script waits for the cursor to park (`.agent-cursor.is-waiting`) on the
control the tool found (`[data-agent-active]`), holds it 2.5 s, then makes the trusted click there. Check a new clip's frames before committing it
(`ffmpeg -i <clip>.mp4 -vf "fps=2/3,scale=800:-2,tile=3x4" -frames:v 1 sheet.png`).

### Social cards and icons

The home and Demos pages share one social card, `public/metadata/og.png`, made with
[metadata-gen](https://metadata-gen.micka.design) from `metadata.config.json` (the agent cursor, `public/logo.svg`, on the
landing's dark palette). Re-run `npx metadata-gen` in this folder to change it; it also writes the favicon set and
`site.webmanifest` to `public/metadata/`. Copy `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` from there to
`public/`, where Blume picks them up by name; metadata-gen's own `favicon.svg` is a lettermark, so ours is drawn by hand
from the cursor's path. `components/social-meta.astro` writes the two pages' OG and Twitter tags. Docs pages get Blume's
per-page cards (`seo.og` in `blume.config.ts`, same palette and mark). `og:image` must be absolute, so every image tag
builds for `https://webmcp-agents.dev`; set `SITE_URL` only for a preview build on another origin.

### The site is an example app

Its own actions are WebMCP tools, each a `defineWebTool` definition (`components/landing/site-tools.ts`, and
`search_docs` in `docs-search.tsx`), registered with the project's packages like any app (`agent-layer.tsx`:
`<WebAgentsProvider tools={tools}>`, which loads the polyfill where the browser has no WebMCP, and the devtools in
development). Nothing on the page is marked for the cursor: a tool finds its control by name (its `title`, or a locator `target` such as
`{ role: "link", name: "GitHub" }`), or is handed the element (a clip's frame, the row of tools). `toggle_theme` is the
common `setTheme()` from `@webmcp-agents/tools`, under the page's own name.

| Tool | Acts on | |
|---|---|---|
| `show_demo({ demo })` | the Demos link (home) or the clip's frame (Demos) | opens `/demos#<demo>`, or replays that clip and outlines it |
| `show_tools()` | the row of tools in the hero | outlines it and answers every tool on the page; the first-visit intro |
| `search_docs({ query })` | the Search button in the FAQ's guide card | types the query into the field beside it; searches the docs' own index |
| `open_docs({ page })` | the Quickstart link, or the Docs link | answers first, then opens a docs page by name (quickstart, tools, agent-cursor, …) |
| `open_faq({ topic })` | that question in the FAQ | opens it and answers the question and its answer |
| `copy_step_code({ step })` | the step's copy button | copies a step's snippet and answers it |
| `copy_install_command()` | the copy button under the steps ("Copy the install command") | answers the command too |
| `toggle_theme({ theme? })` | the theme button in the navbar | light / dark, remembered across the site |
| `open_github()` | the GitHub link (the header's, else the footer's) | `requireConfirmation`: the cursor parks until the person clicks |

The Demos page registers `show_demo`, `open_docs`, `copy_install_command`, `toggle_theme` and `open_github`. The chips
(`try-it.tsx`) call `tool.invoke(args)`, the path every agent takes, and show each call's state from `onAgentEvent`. In
development, `window.agent.invoke("open_faq", { topic: "safety" })` or the devtools panel (Alt+Shift+A) do the same.

On a visitor's first visit the agent runs `show_tools` once (remembered in localStorage; skipped under reduced motion,
on phones, when the page opens scrolled or at a section, and only once the pointer has been still for a moment).

## The docs

- How the pages are written (framework views, compiled examples in `docs/_examples`, the step and reference templates,
  what `scripts/check-docs.mjs` enforces): [docs/README.md](../../docs/README.md#how-these-docs-are-written).
  `components.ts` registers the MDX components of this site (`<RememberFramework>`, `components/docs/`).
- Reference pages take their title from the `# H1`; `.mdx` pages from `title` frontmatter. In `.mdx`, a bare `{` or `<` in prose is JSX.
- Guides and concepts are `.mdx` (Blume's components need no imports); reference pages are `.md`. Each folder's
  `meta.ts` sets its sidebar title and page order: add a new page to its `pages`. Reference READMEs set
  `slug: reference/<package>` so they serve `/docs/reference/<package>` instead of `.../README`. `docs/README.md` is for
  GitHub only (excluded).
- Every docs route mounts under `/docs` (`basePath` in `blume.config.ts`). Links inside the docs are still written as if
  mounted at the root (`/build/add-the-chat`); Blume rewrites them.
- Two header tabs: Docs (`/docs`) and Reference (`/docs/reference`), each with its own sidebar. The brand links home.
- `theme.css` gives the docs the landing page's dark palette.
- `pnpm-workspace.yaml` overrides `satteri` for `blume`: Blume 2.2.7 and its Astro otherwise install two copies and
  every page fails to build. Drop the override once Blume aligns them.
- `vercel.json` carries the headers a static build writes to `dist/vercel.json` (Vercel only reads the project's
  own file): copy them again after a Blume upgrade. Deploy steps: [docs/more/deploy.md](../../docs/more/deploy.md#the-website).
