---
description: "Types the declarative WebMCP attributes, so JSX accepts toolname, tooldescription, toolautosubmit and toolparamdescription on any element."
---

# JSX attributes

Types the declarative WebMCP attributes, so JSX accepts `toolname`, `tooldescription`, `toolautosubmit` and `toolparamdescription` on any element. They are for [declarative forms](../../more/declarative-forms.mdx), the earlier form: a tool you write with [`useWebTool`](./use-web-tool.md) needs nothing added to its markup. The types are type-only; they ship in the package's `.d.ts` without a side-effect import.

## Import

```ts
import "@webmcp-agents/react"; // any import from the package brings the types in
```

## Example

A declarative form. Subscribing is cheap and reversible, so it carries `toolautosubmit`.

<include meta='title="components/subscribe-form.tsx"'>/_examples/shared/reference/react/jsx-attributes.tsx</include>

## Props

Added to React's `HTMLAttributes`, so every element accepts them.

| Name | Type | Default | Description |
|---|---|---|---|
| `toolname` | `string` | none | On a `<form>`, registers the form as a WebMCP tool with this name. On other elements, the earlier way to name the control a tool acts on: the cursor and the confirmation still honour `[toolname="<id>"]`, after a tool's `target` and before the name search. New code gives the tool a `title` or a `target` instead. |
| `tooldescription` | `string` | `""` under the polyfill | The tool's description for the agent. |
| `toolautosubmit` | `""` | not said | Boolean attribute: pass `""` to set it. Lets the agent submit without the person's confirmation. |
| `toolparamdescription` | `string` | none | Describes a form field to the agent. |

## Returns

Nothing: these are types only.

## Notes

- Without `toolautosubmit`, the browser pauses on the submit button until the person clicks it. Set it on cheap, reversible actions, and leave it off for checkout and booking.
- Answer an agent's submit with [`useToolAnswer`](./use-tool-answer.md), especially when the action hides the form: Chrome cancels a call whose form changes or unmounts before it answered.
- Write descriptions for the model, which picks tools and their order from them alone: what it does, when to use it, what it needs first, what comes next. Parameter descriptions say where a value comes from and its format, with an example.
- Under the polyfill, a field's description is `toolparamdescription`, else its first `<label>`'s text, else `aria-description`, else its `name`. See [`PolyfillModelContext`](../polyfill/polyfill-model-context.md#declarative-forms).
- Chrome marks the form an agent is filling with `:tool-form-active` and the paused submit button with `:tool-submit-active`; the polyfill mirrors them as `data-tool-form-active` / `data-tool-submit-active`. [`cursor.css`](../core/cursor-css.md) styles the attributes, and the optional `cursor-native.css` the pseudo-classes (Vite's Lightning CSS warns that they are unknown and keeps them; Turbopack refuses them).

## See also

- [Tools with input](../../build/tools-with-input.mdx), the way new code writes a tool
- [Declarative forms](../../more/declarative-forms.mdx)
- [`useToolAnswer`](./use-tool-answer.md)
- [`PolyfillModelContext`](../polyfill/polyfill-model-context.md)
- [`cursor.css`](../core/cursor-css.md)
