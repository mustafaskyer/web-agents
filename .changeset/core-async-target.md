---
"@webmcp-agents/core": minor
---

A tool's `target` function may return a promise: open the UI its control lives in (a ⌘K palette, a drawer), wait for it, return it. The call waits for it (up to `OPEN_TARGET_MS`, 3 s) before the cursor moves, so the values are typed into the opened UI.
