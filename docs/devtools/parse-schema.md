# `parseSchema`

Turns a tool's `inputSchema` into a `SchemaNode` object. Chrome returns `inputSchema` as a JSON string and the
polyfill returns an object, so the devtools read both through this.

```ts
import { parseSchema } from "@web-agents/devtools";
import type { SchemaNode } from "@web-agents/devtools";
```

## Signature

```ts
function parseSchema(schema: ModelContextToolInfo["inputSchema"]): SchemaNode;

interface SchemaNode {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  [keyword: string]: unknown;
}
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `ModelContextToolInfo["inputSchema"]` | — | The schema from `document.modelContext.getTools()`: a JSON string (Chrome) or an object (polyfill). |

## Returns

A `SchemaNode`. An object is returned as is; `undefined` gives `{}`. A string is parsed; a string that isn't JSON,
or doesn't parse to an object, gives `{}`.

`SchemaNode` is the slice of JSON Schema the runner understands. Unknown keywords pass through the index
signature.

## Example

```ts
import { parseSchema } from "@web-agents/devtools";

const tools = await document.modelContext.getTools();
for (const tool of tools) {
  const schema = parseSchema(tool.inputSchema);
  console.log(tool.name, Object.keys(schema.properties ?? {}));
}
```

## Notes

- A broken schema reads as empty rather than throwing.
- WebMCP input schemas are shallow (a form's fields, a WebTool's zod object), so `SchemaNode` stays small. Anything
  else falls back to raw JSON in `SchemaForm`.
- `ToolView.schema` in the store is already parsed with this.

## See also

- [schema-form.md](./schema-form.md)
- [create-devtools-store.md](./create-devtools-store.md): `ToolView`
