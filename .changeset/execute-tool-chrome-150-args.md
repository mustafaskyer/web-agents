---
"@webmcp-agents/core": patch
---

`executeTool()` recognises Chrome 150's "Failed to parse input arguments" as the wrong args shape and retries with a
JSON string, so the devtools' `window.agent.run` and the chat no longer fail every call on those builds.
