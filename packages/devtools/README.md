# @webmcp-agents/devtools

Devtools for WebMCP pages. See which tools are live on the current screen, run them from a form generated from their
JSON Schema, and watch a timeline of every call: yours from the panel, or a real agent's.

```sh
pnpm add -D @webmcp-agents/devtools
```

```tsx
import { lazy, Suspense } from "react";

// The condition guards the import() itself, so production bundles leave the devtools out.
const Devtools = import.meta.env.DEV
  ? lazy(() => import("@webmcp-agents/devtools/react").then((m) => ({ default: m.WebAgentsDevtools })))
  : () => null;

<WebAgentsProvider tools={catalog}>
  <App />
  <Suspense>
    <Devtools />
  </Suspense>
</WebAgentsProvider>;
```

Open it with the button in the bottom-right corner or Alt+Shift+A. Also available as a TanStack Devtools tab and
without React (`installWebAgentsDevtools`). From the console: `await agent.run("tool_name", { … })`.

## Docs

- [Debug with devtools](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/devtools.mdx)
- [API reference](https://github.com/mustafaskyer/web-agents/blob/main/docs/reference/devtools/README.md)
