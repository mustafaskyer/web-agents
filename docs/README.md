# webmcp-agents docs

The source of the docs site (`apps/docs`, built with [Blume](https://github.com/haydenbleasel/blume)). Run it with
`pnpm --filter @webmcp-agents/docs dev` and open http://localhost:4321/docs (the site's home, `/`, is the landing page).

| Folder | |
|---|---|
| [`index.mdx`](index.mdx) | Introduction (the home page) |
| [`getting-started/`](getting-started) | Quickstart, and using the packages without React |
| [`concepts/`](concepts) | How it works, the agent cursor, tools, tool lifecycle, errors |
| [`guides/`](guides) | Tool descriptions, chat, on-device agent, devtools, polyfill, deploying |
| [`examples/`](examples) | The playground, Field Store and Skyline apps |
| [`reference/`](reference/README.md) | One page per public API, per package (the "Reference" tab) |

Guides and concepts are `.mdx` (they use Blume's components); reference pages stay `.md`. Each folder's `meta.ts` sets
its sidebar title and order. This README is left out of the site (`content.exclude` in `apps/docs/blume.config.ts`).
