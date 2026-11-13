---
"@webmcp-agents/tools": patch
---

`go_to` and `go_back` answer once the address has changed (up to 3 s), not at the click. A client router such as Next.js changes it a moment later; answering first let a chat send its next step before the new page's tools had registered, so the agent could not use them. When the address never changes, `go_to` says so instead of "Opened".
