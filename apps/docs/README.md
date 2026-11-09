# @webmcp-agents/docs

The docs website: a [Blume](https://github.com/haydenbleasel/blume) site that renders the API reference in the repo's
[`docs/`](../../docs/README.md). This app holds only config; **edit content in `docs/`**, not here.

```bash
pnpm --filter @webmcp-agents/docs dev      # http://localhost:4321, reloads on edits in docs/
pnpm --filter @webmcp-agents/docs build    # static site in dist/ (search index, llms.txt, raw .md copies)
pnpm --filter @webmcp-agents/docs test     # blume validate: every internal link and anchor resolves
```

- Pages stay `.md` (in `.mdx`, `{` and `<` become JSX). The title is the file's `# H1`.
- Each `README.md` has a `slug` frontmatter (`index` for the root, the folder name for a package), so it serves `/`
  or `/<package>` instead of `/README`. Give a new package folder one, plus a `meta.ts` with its sidebar `title` and
  `order`.
- `pnpm-workspace.yaml` overrides `satteri` for `blume`: Blume 2.2.7 and its Astro otherwise install two copies and
  every page fails to build. Drop the override once Blume aligns them.
- `vercel.json` carries the headers a static build writes to `dist/vercel.json` (Vercel only reads the project's
  own file): copy them again after a Blume upgrade. Deploy steps: [docs/deploy.md](../../docs/deploy.md#the-docs-site).
