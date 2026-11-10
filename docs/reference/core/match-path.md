---
description: "Tests a pathname against a route pattern."
---

# `matchPath`

Tests a pathname against a route pattern. It powers route-scoped tools: a tool's `match: "/orders"` (see [`defineWebTool`](./define-web-tool.md)) turns it on while its pattern matches, in [`createWebAgents`](./create-web-agents.md) and `<WebAgentsProvider>`. A `match` may be a pattern, several, or a RegExp; only the string patterns use `matchPath`. Call it yourself to test a pattern before you rely on it.

## Import

```ts
import { matchPath } from "@webmcp-agents/core";
```

## Example

```ts
import { matchPath } from "@webmcp-agents/core";

matchPath("/products/:slug", "/products/ocean-tee"); // true
matchPath("/products/:slug", "/products"); // false: needs a segment
matchPath("/search/*", "/search"); // true: * may be empty
matchPath("/search/*", "/search/results/2"); // true
matchPath("/checkout", "/checkout/"); // true: trailing slash
matchPath("/Checkout", "/checkout"); // false: case matters
matchPath("*", "/anything"); // true
```

## Options

`matchPath(pattern, pathname)`.

| Name | Type | Default | Description |
|---|---|---|---|
| `pattern` | `string` | required | Literal segments, `:param` (exactly one segment) and a trailing `*` (the rest, possibly empty), e.g. `"/products/:slug"`. `"*"` alone matches every path. |
| `pathname` | `string` | required | The path to test, e.g. `location.pathname`. A query string or hash is not part of it. |

## Returns

`true` if `pathname` matches `pattern`, otherwise `false`.

## Notes

- `*` only has meaning as the last segment; elsewhere it is a literal.
- Trailing slashes do not matter; case does.
- Compiled patterns are cached per pattern string.
- It is not `URLPattern`, which is not in every browser the polyfill targets.

## See also

- [Where a tool is on](../../build/where-a-tool-is-on.mdx), the page that teaches `match`
- [`defineWebTool`](./define-web-tool.md)
- [`createWebAgents`](./create-web-agents.md)
- [`createToolRegistry`](./create-tool-registry.md)
