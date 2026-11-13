---
"@webmcp-agents/chat": patch
"@webmcp-agents/local-agent": patch
---

The chat notices when the person changes pages themself between turns (a new path, query or hash): the next message reaches the model with a one-line note ("went from /shop to /product/… on their own"), so "add that item" means the page they are on, not the last turn's results. Turns where the page didn't move send exactly what they did before. The on-device agent ranks its tools by what the person wrote, never by that note.
