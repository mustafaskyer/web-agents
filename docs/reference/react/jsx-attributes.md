# JSX attributes

`@webmcp-agents/react` types the declarative WebMCP attributes, so JSX accepts `toolname`, `tooldescription`, `toolautosubmit` and `toolparamdescription` on any element. It is type-only: it ships in the package's `.d.ts` without a side-effect import.

```ts
import "@webmcp-agents/react"; // any import from the package brings the types in
```

## Signature

```ts
declare module "react" {
  interface HTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: "";
    toolparamdescription?: string;
  }
}
```

## Attributes

| Name | Type | Default | Description |
|---|---|---|---|
| `toolname` | `string` | — | On a `<form>`, registers the form as a WebMCP tool with this name. On other elements, names the element a tool acts on: the cursor and the confirmation look for `[toolname="<id>"]`. |
| `tooldescription` | `string` | — | The tool's description for the agent. The polyfill uses `""` when it is missing. |
| `toolautosubmit` | `""` | — | Boolean attribute: pass `""` to set it. Lets the agent submit without the user's confirmation. |
| `toolparamdescription` | `string` | — | Describes a form field to the agent. |

## Returns

—

## Example

From `apps/ecommerce/src/tools/ApplyPromoForm.tsx`, trimmed. Cheap and reversible, so `toolautosubmit`.

```tsx
<form
  toolname="apply_promo"
  tooldescription="Apply a promo code the user gave you to the cart. Only on the checkout page (go_to_page checkout first)."
  toolautosubmit=""
  onSubmit={onSubmit}
>
  <input name="code" required toolparamdescription="The promo code, e.g. WELCOME10" />
  <button type="submit">Apply</button>
</form>
```

An element an imperative tool acts on (`apps/playground/src/tools/ClearCartButton.tsx`):

```tsx
<button type="button" toolname="clear_cart" onClick={() => cart.clear()}>Clear cart</button>
```

## Notes

- Without `toolautosubmit`, the browser pauses on the submit button until the person clicks it. The example apps set it on cheap, reversible actions such as `apply_promo`, and leave it off for checkout and booking.
- Answer an agent's submit with [`useToolAnswer`](./use-tool-answer.md), especially when the action hides the form: Chrome cancels a call whose form changes or unmounts before it answered.
- Write descriptions for the model, which picks tools and their order from them alone: what it does, when to use it, what it needs first, what comes next. Parameter descriptions say where a value comes from and its format, with an example (from the package README).
- Under the polyfill, a field's description is `toolparamdescription`, else its first `<label>`'s text, else `aria-description`, else its `name`. See [`PolyfillModelContext`](../polyfill/polyfill-model-context.md#declarative-forms).
- Vite's Lightning CSS warns that `:tool-form-active` / `:tool-submit-active` are unknown pseudo-classes. They are Chrome's native states and stay in the output; the polyfill mirrors them as `data-tool-form-active` / `data-tool-submit-active`.

## See also

- [`useToolAnswer`](./use-tool-answer.md)
- [`PolyfillModelContext`](../polyfill/polyfill-model-context.md)
- [`useWebTool`](./use-web-tool.md) (imperative tools that act on a `toolname` element)
- [`cursor.css`](../core/cursor-css.md)
