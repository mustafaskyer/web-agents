# `SchemaForm`

A controlled React form for a tool's JSON Schema, the one the devtools runner uses. `defaultValueFor` gives
ready-to-run starting values, so "Run" works on the first click for most tools.

```tsx
import { SchemaForm, defaultValueFor } from "@webmcp-agents/devtools";
import type { SchemaFormProps } from "@webmcp-agents/devtools";
```

## Signature

```ts
function SchemaForm(props: SchemaFormProps): JSX.Element;

interface SchemaFormProps {
  schema: SchemaNode;
  value: unknown;
  onChange(value: unknown): void;
  idPrefix: string;
}

function defaultValueFor(schema: SchemaNode): unknown;
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `schema` | `SchemaNode` | — | The tool's input schema, parsed (see `parseSchema`). |
| `value` | `unknown` | — | The current arguments. |
| `onChange` | `(value: unknown) => void` | — | Called with the whole new value on every edit. |
| `idPrefix` | `string` | — | Prefix for element ids. Must be unique per form on the page. |

## Returns

`SchemaForm` renders the fields. A top-level object renders its fields directly, without a fieldset. An object with
no properties renders "This tool takes no arguments."

`defaultValueFor` returns the starting value for a schema, in this order:

1. `default`, then `const`.
2. Objects: an object of each property's default. Arrays: `[]`.
3. `integer` / `number`: `minimum`, else `1`. `boolean`: `true`.
4. Otherwise the first non-empty `enum` option, a sample from the description (`"e.g. 123"` gives `"123"`), a
   placeholder for a known format (`email`: `you@example.com`, `date`: today, `uri`: `https://example.com`), or `""`.

## Field types

| Schema | Control |
|---|---|
| `string` | text input; `format: "date"` gives a date input; a `textarea` when `maxLength > 120` or the description says "multiline" |
| `enum` | select with a "(not set)" first option |
| `number`, `integer` | number input with `min` / `max`; `integer` uses step 1 |
| `boolean` | checkbox |
| `object` | fieldset of its properties; `required` ones are marked |
| `array` | list of `items` fields with Add item and Remove |
| `oneOf`, `anyOf`, `allOf`, `$ref`, `not`, or no type | raw JSON textarea for that subtree |

## Example

```tsx
import { useState } from "react";
import type { ModelContextToolInfo } from "@webmcp-agents/core";
import { SchemaForm, defaultValueFor, parseSchema } from "@webmcp-agents/devtools";

function Runner({ tool }: { tool: ModelContextToolInfo }) {
  const schema = parseSchema(tool.inputSchema);
  const [args, setArgs] = useState(() => defaultValueFor(schema));
  return (
    <form onSubmit={(e) => { e.preventDefault(); void window.agent?.run(tool.name, args as Record<string, unknown>); }}>
      <SchemaForm schema={schema} value={args} onChange={setArgs} idPrefix={`run-${tool.name}`} />
      <button type="submit">Run</button>
    </form>
  );
}
```

## Notes

- No validation: the tool validates, and its error comes back in the result.
- An empty text or number field removes the key from the value, so a missing required field is reported by the tool,
  not by the form.
- Numbers are coerced from the input text. Text that doesn't parse as a number is sent as the string.
- The JSON field keeps the last valid value while the text doesn't parse, and shows "Not valid JSON".
- Styles (`.field`, `.input`, `.hint` and so on) live in the devtools' shadow root. Outside it the form is unstyled.

## See also

- [parse-schema.md](./parse-schema.md): `parseSchema`, `SchemaNode`
- [copy-as-code.md](./copy-as-code.md)
