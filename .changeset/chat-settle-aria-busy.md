---
"@webmcp-agents/chat": patch
---

After a tool call, the session also waits while the page is `aria-busy` (a Suspense fallback, a skeleton) before its next request, and counts the quiet time from when the loading ends (capped at 1.5 s as before). A route that streams registers its component tools only once it has rendered: the agent could reach the next step without them (`add_to_cart` on a product page opened by `open_product`).
