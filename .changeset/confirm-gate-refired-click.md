---
"@webmcp-agents/core": patch
---

- core: a `requireConfirmation` tool on a React Aria `Button` or `Link` no longer runs the element's own action after the confirming click. React Aria's `usePress` calls `el.click()` itself when the real click never reached its element; for 300 ms after the confirming click the gate now swallows that scripted click as well, on the tool's element and on one around or inside it.
