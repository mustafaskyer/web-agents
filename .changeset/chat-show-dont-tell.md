---
"@webmcp-agents/chat": minor
---

The default system prompt says the page exposes WebMCP tools that a visible cursor performs, and asks the model to show rather than tell: use the tools that put what the user asked for on the page, step by step as a person would, and say only what the tools did. It also says the tool list is read again at every step, so a model that navigated uses the new page's tools instead of concluding from an earlier step that they are missing. The delegation note no longer asks to relay a sub-agent's answer (the chat already shows it); a delegate card no longer prints that answer a second time, and a reply that only repeats it word for word is left out.
