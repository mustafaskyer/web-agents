# `webToolSignature`

Returns a string of what WebMCP sees of a tool. When it changes, the tool must re-register; when it doesn't, it mustn't, because Chrome cancels the calls of a tool whose definition changes.

```ts
import { webToolSignature } from "@web-agents/core";
```

## Signature

```ts
const webToolSignature: (t: WebTool) => string;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `t` | `WebTool` | — | The tool to describe. |

## Returns

`JSON.stringify` of `[id, title, description, jsonSchema, annotations ?? null, !!requireConfirmation, target ?? null]`.

## Example

```ts
import { webToolSignature } from "@web-agents/core";

if (webToolSignature(next) !== webToolSignature(current)) {
  // re-register: the agent-visible definition changed
}
```

## Notes

- `execute` is not part of the signature. A new `execute` alone needs no re-registration.
- A function `target` stringifies to `null` in `JSON.stringify`'s array output, so changing one function `target` for another does not change the signature.
- [`createToolRegistry`](./create-tool-registry.md) uses it in `update(catalog)`, and `useWebTool` in `@web-agents/react` uses it too.

## See also

- [`createToolRegistry`](./create-tool-registry.md)
- [`defineWebTool`](./define-web-tool.md)
