---
"@webmcp-agents/react": minor
"@webmcp-agents/devtools": minor
"@webmcp-agents/core": minor
---

The provider installs the devtools in development. `<WebAgentsProvider devtools>` takes `boolean | ProviderDevtoolsOptions`, default `true`: when `process.env.NODE_ENV === "development"` (`vite dev`, `next dev`, `astro dev`, webpack's development mode) it loads `@webmcp-agents/devtools` with a dynamic `import()` and installs the floating panel (Alt+Shift+A, `window.agent`) wired to its own cursor, so the Settings switches work. The check sits literally around the `import()`, so bundlers drop it from production builds: no devtools chunk is emitted. Tests (`NODE_ENV=test`) get no panel either. `devtools={false}` turns it off; an object passes panel options (`initialOpen`, `hotkey`, `initialSettings`, `eventClient`). One panel per page however many providers mount; StrictMode's remount keeps it.

- `@webmcp-agents/react`: the `devtools` prop and the `ProviderDevtoolsOptions` type. `@webmcp-agents/devtools` is now a dependency and `react-dom` a peer. To move on, delete your own development-only `installWebAgentsDevtools()` effect or lazy `<WebAgentsDevtools />` and uninstall `@webmcp-agents/devtools` (an app that keeps its own install gets a warning pointing at `devtools={false}`).
- `@webmcp-agents/devtools`: no longer depends on `@webmcp-agents/react` (not even as an optional peer); `<WebAgentsDevtools />`, the TanStack plugin and `installWebAgentsDevtools()` default `visuals` to the started provider's or `createWebAgents`' cursor through core's `currentAgentVisuals()`. They stay for pages without the provider and for placing the panel by hand (with `devtools={false}`).
- `@webmcp-agents/core`: new `currentAgentVisuals()`. `agents.visuals.setSpotlight` / `setYieldToUser` called before the cursor installs (the polyfill still loading) now become its starting options instead of being dropped. `createWebAgents` does not install the devtools (they are built on core): a page without React calls `installWebAgentsDevtools()` after it.
