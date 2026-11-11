---
description: "Writes the snippet that repeats a tool call from the browser console or a test; the runner's copy buttons use it."
---

# `toAgentInvokeCode`

Writes the snippet that repeats a tool call from the browser console or a test; the runner's copy buttons use it. `toExecuteToolCode` writes the same call through WebMCP directly. `toAgentRunCode` is the earlier name of `toAgentInvokeCode`.

## Import

```ts
import { toAgentInvokeCode, toExecuteToolCode } from "@webmcp-agents/devtools";
```

## Example

Copy a call as code, or print the WebMCP version.

<include meta='title="src/copy-call.ts"'>/_examples/shared/reference/devtools/copy-as-code.ts</include>

## Options

`toAgentInvokeCode(name, args)` and `toExecuteToolCode(name, args)` take the same two arguments.

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | The tool name, written with `JSON.stringify`. |
| `args` | `unknown` | required | The arguments, written with `JSON.stringify(args, null, 2)`. |

## Returns

A string of code. `toAgentInvokeCode` uses the devtools' own console helper:

```js
await agent.invoke("add_to_cart", {
  "quantity": 2
});
```

`toExecuteToolCode` finds the tool object first, because Chrome takes the tool object from `getTools()`:

```js
const tool = (await document.modelContext.getTools()).find((t) => t.name === "add_to_cart");
await document.modelContext.executeTool(tool, {
  "quantity": 2
});
```

## Notes

- `agent.invoke` (and `agent.run`, the same function) exists only while the devtools are installed. The runner's "Copy as" button writes `agent.invoke(…)`.
- `toAgentRunCode` is deprecated: the same function as `toAgentInvokeCode`.
- `executeTool` argument shapes differ by Chrome version (object or JSON string). The snippet passes an object. Library code should use core's [`executeTool()`](../core/execute-tool.md) instead of calling `document.modelContext.executeTool` directly.

## See also

- [Devtools](../../build/devtools.mdx), the page that teaches the console helper
- [`createDevtoolsStore`](./create-devtools-store.md): `window.agent`
- [`SchemaForm`](./schema-form.md)
