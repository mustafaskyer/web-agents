# @webmcp-agents/react

React bindings for WebMCP tools: say once which tools the agent may see, turn them on globally, per route or per
mounted component, and get the agent cursor with no ordering rules and no `toolchange` churn.

```sh
pnpm add @webmcp-agents/react @webmcp-agents/core
```

```tsx
import { EnableTools, WebAgentsProvider } from "@webmcp-agents/react";
import "@webmcp-agents/core/cursor.css";

const catalog = [getCart, listOrders, removePromo]; // module level: every tool the app may expose

<WebAgentsProvider
  tools={catalog}
  global={["get_cart"]}                       // always on
  routes={{ "/orders": ["list_orders"] }}     // on while the pathname matches
  context={cart}                              // reaches execute as ctx.context
  visuals={{ spotlight: true }}               // the agent cursor's options, or false
>
  <App />
</WebAgentsProvider>;

<EnableTools names={["remove_promo"]} />      // on while this component is mounted
```

## Docs

- [Quickstart](https://github.com/mustafaskyer/web-agents/blob/main/docs/getting-started/quickstart.mdx)
- [Tools](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/tools.mdx): forms or WebTools, scopes, confirmation
- [Tool lifecycle](https://github.com/mustafaskyer/web-agents/blob/main/docs/concepts/tool-lifecycle.mdx): StrictMode, routes and calls in flight
- [Writing tool descriptions](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/tool-descriptions.mdx)
- [API reference](https://github.com/mustafaskyer/web-agents/blob/main/docs/reference/react/README.md)
