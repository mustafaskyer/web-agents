---
"@webmcp-agents/chat": minor
"@webmcp-agents/devtools": minor
"@webmcp-agents/core": minor
---

Call an agent from code, and see in the devtools what the cursor will do.

- chat: every agent from `defineWebAgent` has `agent.invoke(text, { adapter?, signal?, onStep? })`, which runs it on the page with no chat and resolves to `{ text, steps, messages }`. The agent stays plain data a server imports: `invoke` loads the browser loop on its first call and rejects on the server.
- chat: `useWebAgent(agent, { adapter? })` → `{ invoke, stop, status, steps, text, error }`, with `status` "idle", "running", "waiting" (a tool parked on the person's click) or "error". `invoke` never rejects.
- chat: `defineWebAgent({ tools })` also takes tool objects (`[tools.getCart, "list_orders"]`).
- chat: the adapter defaults to one shared `createCloudAdapter()`: `<AgentChat agent={shopper} />` needs no `adapter` prop.
- chat: `useAgentSession`, `useAgentChat`, `<AgentChat>`, `useWebAgent` and `agent.invoke` run one shared loop; the page's tool list is now also refreshed while the model thinks.
- devtools: each tool shows its resolved control ("button · Add to cart", "none: runs unseen", "3 matches", "depends on the call"), the field each parameter would be typed into, its `match` and whether the current path fits, and its flags as badges. Catalog tools whose `match` does not fit are listed as "off here". Locate goes to the control the cursor would use, with no `toolname` needed. The list follows the page (URL changes and rendered controls), not only tool changes.
- devtools: `window.agent.invoke(name, args)` is the console helper (`agent.run` stays, the same function); "Copy as" writes `agent.invoke(…)` (`toAgentInvokeCode`; `toAgentRunCode` is a deprecated alias).
- core: `inspectTools()` lists every WebTool on the page (registered, and the catalog tools of each started `createWebAgents`) with the controls and fields the cursor would use and whether its `match` fits.
