---
"@webmcp-agents/tools": minor
---

New package: common WebMCP tools, ready-made. `getTime()`, `getLocation()`, `getPage()`, `goTo({ pages })`, `goBack()`, `scrollTo()` and `setTheme({ get?, set? })` each return a `defineWebTool` tool (`get_time`, `get_location`, `get_page`, `go_to`, `go_back`, `scroll_to`, `set_theme`) to put in your catalog. Framework-free, SSR-safe and tree-shakeable: `go_to` clicks the page's own link (so any client router handles it) and falls back to `location.assign`; `set_theme` presses the site's theme switch, else calls `set`; `get_location` needs no lookup service (pass `lookup` for city, region and country). Every factory takes `{ id?, description? }`.
