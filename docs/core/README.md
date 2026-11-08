# `@web-agents/core`

`@web-agents/core` shows the person using a page what a WebMCP agent is doing: a ghost cursor that glides to the tool, types the agent's values, clicks, and parks on a submit button while the browser waits for confirmation. The visual layer is driven only by WebMCP lifecycle events, so tools don't know it exists, and it gets out of the way the moment the user moves. The package also holds the tool model shared by the other `@web-agents/*` packages: `defineWebTool`, a ref-counted tool registry, deferred release helpers, error codes for tool results, a cross-browser `executeTool`, and the WebMCP types.

```sh
pnpm add @web-agents/core
```

```ts
import { installAgentVisuals, onAgentEvent } from "@web-agents/core";
import "@web-agents/core/cursor.css";
```

## Visual layer

| File | Description |
|---|---|
| [`installAgentVisuals`](./install-agent-visuals.md) | Install the ghost cursor, spotlight and yield-to-user layer. Includes `AgentVisualsOptions`, `AgentVisuals`, `SpotlightOptions`, `YieldOptions`. |
| [`onAgentEvent`](./on-agent-event.md) | Subscribe to agent activity. Includes `AgentEvent`. |
| [`waitingForUser`](./waiting-for-user.md) | Say that a tool is waiting for the person. |
| [`UI_HOST_ATTR`](./ui-host-attr.md) | The attribute that marks library UI, so input there never yields the cursor. |
| [`@web-agents/core/cursor.css`](./cursor-css.md) | The stylesheet for the cursor, ring, tag, spotlight and native agent states. |

## Tools

| File | Description |
|---|---|
| [`defineWebTool`](./define-web-tool.md) | Define a tool once for WebMCP, devtools and server agents. Includes `WebTool`, `WebToolConfig`, `WebToolContext`, `Register`, `RegisteredContext`, `TargetFn`, `WebToolAnnotations`, `WebToolInputError`. |
| [`registerWebTool`](./register-web-tool.md) | Register a `WebTool` with `document.modelContext`. |
| [`toModelContextTool`](./to-model-context-tool.md) | Adapt a `WebTool` to the shape `registerTool` takes. Includes `ToModelContextToolOptions`. |
| [`isWebMCPAvailable`](./is-webmcp-available.md) | Check whether the page has `document.modelContext`. |
| [`webToolSignature`](./web-tool-signature.md) | The part of a tool WebMCP sees, as a string to compare. |
| [`ConfirmationUnavailableError`](./confirmation-unavailable-error.md) | Thrown when a confirm-gated tool has nothing to click on. |
| [`createToolRegistry`](./create-tool-registry.md) | Decide which catalog tools are registered, ref-counted. Includes `ToolRegistry`, `ToolRegistryOptions`. |
| [`createCallTracker`](./create-call-tracker.md) | Count a tool's in-flight calls. Includes `CallTracker`. |
| [`deferRelease`](./defer-release.md) | Unregister later, after calls settle. Includes `RESPONSE_GRACE_MS`, `DeferReleaseOptions`. |
| [`matchPath`](./match-path.md) | Match a pathname against a route pattern for route-scoped tools. |

## Calling tools and results

| File | Description |
|---|---|
| [`executeTool`](./execute-tool.md) | Call a page's tool like an agent, across Chrome builds and the polyfill. Includes `normalizeToolResult`, `ExecuteToolOptions`. |
| [`toolError`](./tool-error.md) | Build and read coded failures. Includes `ToolErrorCode`, `RETRYABLE`, `toolErrorCode`. |
| [`WebToolError`](./web-tool-error.md) | Throw from a tool to pick the error code the agent gets. |
| [`errorResult`](./error-result.md) | Small result helpers: `errorResult`, `errorText`, `isErrorText`, `isAbortError`, `toToolResult`. |
| [WebMCP types](./webmcp-types.md) | `ModelContext`, `ModelContextTool`, `ModelContextToolInfo`, `ModelContextToolResult`, `ModelContextExecuteOptions`, `ToolEvent`, `JSONSchema`, and the globals. |
