---
description: "Turns a tool's inputSchema into a SchemaNode object."
---

# `parseSchema`

Turns a tool's `inputSchema` into a `SchemaNode` object. Chrome returns `inputSchema` as a JSON string and the polyfill returns an object, so the devtools read both through this; use it when you build a UI from `getTools()`.

## Import

```ts
import { parseSchema } from "@webmcp-agents/devtools";
import type { SchemaNode } from "@webmcp-agents/devtools";
```

## Example

List each tool's parameters, whichever shape the browser gave.

<include meta='title="src/list-parameters.ts"'>/_examples/shared/reference/devtools/parse-schema.ts</include>

## Options

`parseSchema(schema)` takes one argument.

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `ModelContextToolInfo["inputSchema"]` | required | The schema from `document.modelContext.getTools()`: a JSON string (Chrome) or an object (polyfill). |

### `SchemaNode`

The slice of JSON Schema the runner understands. Unknown keywords pass through the index signature.

| Name | Type | Description |
|---|---|---|
| `type` | `string \| string[]` | The JSON Schema type; `["string", "null"]` reads as `"string"`. |
| `title` | `string` | The label `SchemaForm` shows instead of the property name. |
| `description` | `string` | The parameter's description; `defaultValueFor` takes a sample from `e.g. …` in it. |
| `default` | `unknown` | The starting value in the form. |
| `enum` | `unknown[]` | Allowed values, shown as a select. |
| `const` | `unknown` | A fixed value. |
| `format` | `string` | `date`, `email`, `uri`: the form's input type and sample value. |
| `minimum` | `number` | Lower bound of a number, and its starting value. |
| `maximum` | `number` | Upper bound of a number. |
| `maxLength` | `number` | A string longer than 120 gets a textarea. |
| `properties` | `Record<string, SchemaNode>` | An object's parameters. |
| `required` | `string[]` | Names of the required properties. |
| `items` | `SchemaNode` | The schema of an array's items. |

## Returns

A `SchemaNode`. An object is returned as is; `undefined` gives `{}`. A string is parsed; a string that is not JSON, or does not parse to an object, gives `{}`.

## Notes

- A broken schema reads as empty rather than throwing.
- WebMCP input schemas are shallow (a form's fields, a tool's zod object), so `SchemaNode` stays small. Anything else falls back to raw JSON in [`SchemaForm`](./schema-form.md).
- `ToolView.schema` in the store is already parsed with this.

## See also

- [`SchemaForm`](./schema-form.md)
- [`createDevtoolsStore`](./create-devtools-store.md): `ToolView`
