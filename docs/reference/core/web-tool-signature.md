---
description: "Returns a string of what WebMCP sees of a tool."
---

# `webToolSignature`

Returns a string of what WebMCP sees of a tool. When it changes, the tool must re-register; when it does not, it must not, because Chrome cancels the calls of a tool whose definition changes. Reach for it when you build your own registration on top of [`registerWebTool`](./register-web-tool.md).

## Import

```ts
import { webToolSignature } from "@webmcp-agents/core";
```

## Example

Re-register a tool only when the definition the agent sees changed.

<include meta='title="signature.ts"'>/_examples/shared/reference/core/web-tool-signature.ts</include>

## Options

`webToolSignature(tool)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `tool` | `WebTool` | required | The tool to describe, made with [`defineWebTool`](./define-web-tool.md). |

## Returns

A `string`: `JSON.stringify` of `[id, title, description, jsonSchema, annotations ?? null, !!requireConfirmation, target ?? null]`, where `annotations` are the merged hints (the tool's `annotations` with its flags written over them), so changing a flag changes the signature.

## Notes

- `execute` is not part of the signature: a new `execute` alone needs no re-registration. Neither are `match`, `fill` or `fields`: a registered tool reads them from its latest definition on every call.
- A locator or selector `target` is part of the signature. A function `target` stringifies to `null`, so swapping one function `target` for another does not change the signature (the new one is read on the next call).
- [`createToolRegistry`](./create-tool-registry.md) uses it in `update(catalog)`, and [`useWebTool`](../react/use-web-tool.md) uses it to decide when to re-register.

## See also

- [Define a tool](../../build/define-a-tool.mdx), what a definition holds
- [`createToolRegistry`](./create-tool-registry.md), which compares signatures
- [`defineWebTool`](./define-web-tool.md), the definition it reads
- [Tool lifecycle](../../concepts/tool-lifecycle.mdx), why a changed tool cancels calls
