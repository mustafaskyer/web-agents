# `toAgentRunCode`

Snippets that repeat a tool call from the browser console or a test. The runner's copy buttons use them.
`toExecuteToolCode` writes the same call through WebMCP directly.

```ts
import { toAgentRunCode, toExecuteToolCode } from "@webmcp-agents/devtools";
```

## Signature

```ts
const toAgentRunCode: (name: string, args: unknown) => string;
const toExecuteToolCode: (name: string, args: unknown) => string;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | The tool name. Written with `JSON.stringify`. |
| `args` | `unknown` | — | The arguments. Written with `JSON.stringify(args, null, 2)`. |

## Returns

A string of code.

`toAgentRunCode` uses the devtools' own console helper:

```js
await agent.run("add_to_cart_mug-01", {
  "qty": 3
});
```

`toExecuteToolCode` finds the tool object first, because Chrome takes the tool object from `getTools()`:

```js
const tool = (await document.modelContext.getTools()).find((t) => t.name === "add_to_cart_mug-01");
await document.modelContext.executeTool(tool, {
  "qty": 3
});
```

## Example

```ts
import { toAgentRunCode } from "@webmcp-agents/devtools";

await navigator.clipboard.writeText(toAgentRunCode("add_to_cart_mug-01", { qty: 3 }));
```

## Notes

- `agent.run` exists only while the devtools are installed.
- `executeTool` argument shapes differ by Chrome version (object or JSON string). The snippet passes an object.
  Library code should use core's `executeTool()` instead of calling `document.modelContext.executeTool` directly.

## See also

- [install-agent-console.md](./install-agent-console.md): `window.agent`
- [schema-form.md](./schema-form.md)
