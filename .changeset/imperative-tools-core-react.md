---
"@webmcp-agents/core": minor
"@webmcp-agents/react": minor
---

One way to write a tool: `execute`, plus an optional `target`. Nothing is added to the markup for the cursor.

- core: a tool's control is found by role and name, like a person would: its `target` (now a locator `{ role, name, within }`, a CSS selector, or a function of the input returning either or the element), else an element marked `toolname="<id>"`, else the button, link, tab, menu item or switch named like the tool's `title` (or its id read as words). `locate` and `ToolLocator` are exported.
- core: a tool with an `inputSchema` shows its call on the page: the cursor types each value into the control whose `name` is the parameter or whose label matches it (closest to the tool's control), before it clicks or parks. `fields` points a parameter elsewhere or turns it off; `fill(values)` runs after the typing for what cannot be typed (a custom select). Text is typed a character at a time; a number, date, range or native select is written once; a checkbox or radio is toggled by a click; a custom widget is visited, never written. Without the visuals, under reduced motion or with a yielded cursor, the values are still written, in one step. `fill` events are emitted for tools too.
- core: the input is validated before anything moves; invalid input never reaches the page.
- core: a `requireConfirmation` tool found by name needs exactly one matching control; with none or several the call fails with a hint instead of running unconfirmed.
- core: flags in plain words, `readOnly`, `destructive`, `repeatable`, `external`, `safeResponse`, become the WebMCP annotations at registration (merged with `annotations`).
- core: `tool.invoke(input)` calls a tool the way an agent would (cursor, typing, confirmation) and resolves to what `execute` returned.
- core: `match` on a tool (a path pattern, several, or a RegExp) says where it is on. `createWebAgents({ tools, availableTools, visuals })` registers an object (or array) catalog, follows the browser's URL itself (the Navigation API, else `history`, plus back/forward and hash changes; `watchPathname` is exported) and returns `setAvailableTools`, `setTools`, `destroy`. Two tools with one id throw, naming both keys.
- core: `registerWebTool` also takes a function returning the tool, for a definition that changes while it stays registered.
- core: a tool that is not `readOnly` and finds no control says so once in the development console.
- core: declarative forms: a number, date or range field is now written in one step instead of a character at a time.
- react: `<WebAgentsProvider tools availableTools visuals>` is a thin wrapper over `createWebAgents`: `tools` is an object, `availableTools` lists tools by reference or by key, and `match` tools follow the URL with nothing wired to a router. The array catalog, `global`, `routes`, `pathname` and `context` keep working as before.
- react: `useWebTool({ … })` takes the definition itself (or a defined tool) and returns `{ invoke, registered, supported }`. Calls read the latest render's `execute`, `target`, `fields` and `fill`.
- react: `usePathname` follows `history.pushState` / `replaceState` in browsers without the Navigation API as well.
