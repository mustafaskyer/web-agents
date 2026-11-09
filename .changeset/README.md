# Changesets

Describe a change to a published `@webmcp-agents/*` package with `pnpm changeset` (pick the packages and the bump).
The release workflow turns pending changesets into a "Version Packages" PR, and publishes to npm when it merges.
The six public packages are versioned together (`fixed`); the apps and `@webmcp-agents/vercel-api` are never published.
