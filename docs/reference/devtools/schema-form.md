---
description: "A controlled React form for a tool's JSON Schema, the one the devtools runner uses."
---

# `SchemaForm`

A controlled React form for a tool's JSON Schema, the one the devtools runner uses. Pair it with `defaultValueFor`, which gives ready-to-run starting values so "Run" works on the first click for most tools.

## Import

```tsx
import { defaultValueFor, SchemaForm } from "@webmcp-agents/devtools";
import type { SchemaFormProps } from "@webmcp-agents/devtools";
```

## Example

A runner for one tool: a form from its schema and a Run button that calls it like an agent.

<include meta='title="components/runner.tsx"'>/_examples/shared/reference/devtools/schema-form.tsx</include>

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `SchemaNode` | required | The tool's input schema, parsed (see [`parseSchema`](./parse-schema.md)). |
| `value` | `unknown` | required | The current arguments. The form is controlled: it shows exactly this. |
| `onChange` | `(value: unknown) => void` | required | Called with the whole new value on every edit. |
| `idPrefix` | `string` | required | Prefix for element ids. Must be unique per form on the page. |

### Field types

| Schema | Control |
|---|---|
| `string` | text input; `format: "date"` gives a date input; a textarea when `maxLength > 120` or the description says "multiline" |
| `enum` | select with a "(not set)" first option |
| `number`, `integer` | number input with `min` / `max`; `integer` uses step 1 |
| `boolean` | checkbox |
| `object` | fieldset of its properties; `required` ones are marked |
| `array` | list of `items` fields with Add item and Remove |
| `oneOf`, `anyOf`, `allOf`, `$ref`, `not`, or no type | raw JSON textarea for that subtree |

### `defaultValueFor(schema)`

Returns the starting value for a schema, in this order:

1. `default`, then `const`.
2. Objects: an object of each property's default. Arrays: `[]`.
3. `integer` / `number`: `minimum`, else `1`. `boolean`: `true`.
4. Otherwise the first non-empty `enum` option, a sample from the description (`"e.g. 123"` gives `"123"`), a placeholder for a known format (`email`: `you@example.com`, `date`: today, `uri`: `https://example.com`), or `""`.

## Returns

`SchemaForm` renders the fields. A top-level object renders its fields directly, without a fieldset. An object with no properties renders "This tool takes no arguments."

## Notes

- No validation: the tool validates, and its error comes back in the result.
- An empty text or number field removes the key from the value, so a missing required field is reported by the tool, not by the form.
- Numbers are coerced from the input text. Text that does not parse as a number is sent as the string.
- The JSON field keeps the last valid value while the text does not parse, and shows "Not valid JSON".
- Styles (`.field`, `.input`, `.hint` and so on) live in the devtools' shadow root. Outside it the form is unstyled.

## See also

- [`parseSchema`](./parse-schema.md): `parseSchema`, `SchemaNode`
- [`createDevtoolsStore`](./create-devtools-store.md): the runner's store
- [`toAgentInvokeCode`](./copy-as-code.md)
