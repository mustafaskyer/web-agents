# `matchPath`

Tests a pathname against a route pattern. It powers route-scoped tools: `<WebAgentsProvider routes={{ "/orders": ["list_orders"] }}>` in `@web-agents/react` enables a tool while its pattern matches.

```ts
import { matchPath } from "@web-agents/core";
```

## Signature

```ts
function matchPath(pattern: string, pathname: string): boolean;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string` | — | Literal segments, `:param` (exactly one segment) and a trailing `*` (the rest, possibly empty). `"*"` alone matches every path. |
| `pathname` | `string` | — | The path to test, e.g. `location.pathname`. |

## Returns

`true` if `pathname` matches `pattern`.

## Example

```ts
import { matchPath } from "@web-agents/core";

matchPath("/products/:slug", "/products/ocean-tee");   // true
matchPath("/products/:slug", "/products");             // false: :param needs one segment
matchPath("/search/*", "/search");                     // true: * may be empty
matchPath("/search/*", "/search/results/2");           // true
matchPath("/checkout", "/checkout/");                  // true: trailing slashes don't matter
matchPath("/Checkout", "/checkout");                   // false: case matters
matchPath("*", "/anything");                           // true
```

## Notes

- `*` only has meaning as the last segment; elsewhere it is a literal.
- Compiled patterns are cached per pattern string.
- It is not `URLPattern`, which isn't in every browser the polyfill targets.

## See also

- [`createToolRegistry`](./create-tool-registry.md)
