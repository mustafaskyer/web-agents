---
"@webmcp-agents/core": minor
---

`cursor.css` no longer contains Chrome's native WebMCP pseudo-classes (`:tool-form-active`, `:tool-submit-active`), so every bundler can import it, Next.js with Turbopack included: `import "@webmcp-agents/core/cursor.css"` in any framework, no copy to `public/`. The native rules move to a new optional stylesheet, `@webmcp-agents/core/cursor-native.css`, for a page that runs Chrome's native WebMCP without `installAgentVisuals()`. Nothing changes for pages with the visuals or the polyfill: `cursor.css` still styles `[data-agent-active]`, `[data-tool-form-active]` and `[data-tool-submit-active]`.
