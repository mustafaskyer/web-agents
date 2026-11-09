# Feature: npm scope rename `@web-agents/*` → `@webmcp-agents/*`, Phase 9

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Read first:
- `.agents/plans/00-web-agents-roadmap.md` (the "npm scope" locked decision, updated 2026-11-08)

## Feature Description

Every published and private workspace package moves from the `@web-agents` npm scope to **`@webmcp-agents`**
(`@webmcp-agents/core`, `/react`, `/polyfill`, `/devtools`, `/chat`, `/local-agent`, `/vercel-api`, `/docs`,
`/example-ecommerce`, `/example-flights`). The custom export condition that lets apps and typecheck resolve package
source becomes `"@webmcp-agents/source"`. The project's display name (README H1, docs site title, `docs/index.mdx`)
becomes `webmcp-agents`. Nothing else changes.

**Not renamed (deliberate):** API identifiers (`WebAgentsProvider`, `useWebAgents`, `webAgentsChatDev`,
`installWebAgentsDevtools`, `WebAgentsDevtools`), the `data-web-agents-ui` host attribute, `WEB_AGENTS_*` env vars,
`.wa-chat*` CSS classes, `web-agents:*` storage keys, the GitHub repository `mustafaskyer/web-agents`, and the
historical phase plans `01`–`08` (they describe what was built under the old name).

## User Story

As a maintainer
I want the packages published under a scope that says what they are for (WebMCP)
So that the npm names match the project before the first release

## Problem Statement

1,042 occurrences of `@web-agents` in 241 files: package names, `workspace:` deps, imports, the export condition in
`tsconfig.base.json` / every `vite.config.ts` / vitest configs / each package's `exports`, `.changeset/config.json`,
docs, README, CLAUDE.md.

## Solution Statement

One `sed` pass over tracked and untracked files (never `node_modules`, `dist`, `.blume`, `.turbo`), excluding the
historical plans; `pnpm install` to rewrite the lockfile's workspace dependency names; display-name edits by hand;
`pnpm check` proves every import and condition resolved.

## Feature Metadata

**Feature Type**: Rename
**Estimated Complexity**: Low (mechanical, but touches everything)
**Primary Systems Affected**: all packages and apps, docs, configs
**Dependencies**: none. The maintainer must own the `webmcp-agents` npm org before `release.yml` publishes
(`npm view @webmcp-agents/core` was 404 on 2026-11-08: the scope is free).

---

## CONTEXT REFERENCES

### Relevant Codebase Files

- `tsconfig.base.json` (`customConditions`), `apps/*/vite.config.ts` (`resolve.conditions`),
  `packages/*/vitest.config.ts` (`ssr.resolve.conditions` where present), `packages/*/package.json` (`name`,
  `exports` conditions, `workspace:` deps, `repository.directory` unchanged).
- `.changeset/config.json` (`fixed`, `ignore`).
- `README.md`, `docs/README.md`, `docs/index.mdx`, `apps/docs/blume.config.ts` (display name).
- `CLAUDE.md` (commands with `--filter`, project structure).

---

## STEP-BY-STEP TASKS

### 1. Rewrite the scope

```bash
files=$(git grep -l --untracked "@web-agents" | grep -v -E "^\.agents/plans/0[1-8]-")
echo "$files" | xargs sed -i '' 's#@web-agents/#@webmcp-agents/#g; s#@web-agents#@webmcp-agents#g'
git grep -c --untracked "@web-agents" | grep -v "plans/0[1-8]"   # expect nothing
```

### 2. Display name

`README.md:1` → `# webmcp-agents`; `docs/README.md:1`; `docs/index.mdx` `title:` and the two prose mentions;
`apps/docs/blume.config.ts` `title`. The `github.repo` stays `web-agents`.

### 3. Roadmap

`00-web-agents-roadmap.md` "npm scope" row: `@webmcp-agents/*` with the date and the "API identifiers unchanged" note.
Title line uses the new scope. The file name stays.

### 4. Lockfile

`pnpm install` (lockfile importers rename; no resolution change).

### 5. Validate

`pnpm check` (stop `pnpm dev` first). Then `pnpm dev` and load the three apps: HMR into package source still works
(the condition is honoured).

---

## VALIDATION COMMANDS

```bash
git grep -c --untracked "@web-agents" | grep -v "plans/0[1-8]"     # no output
grep -rn "web-agents/source" --include=*.json --include=*.ts . | grep -v node_modules   # no output
pnpm install && pnpm check
pnpm turbo run check-exports
```

## ACCEPTANCE CRITERIA

- [ ] No `@web-agents` outside `.agents/plans/01-08`
- [ ] `pnpm check` and `check-exports` green; `pnpm dev` serves all apps with source HMR
- [ ] README, docs title and roadmap say `webmcp-agents`

## NOTES

- Done on 2026-11-08 in the same session that produced this plan; this file records the decision and the procedure.
- If the wider rename (identifiers, attribute, env vars, CSS classes, storage keys) is ever wanted, it is a breaking
  change for every consumer and deserves its own changeset and migration note.
