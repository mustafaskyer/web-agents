# `isWebMCPAvailable`

Returns `true` when the page has `document.modelContext`, from native WebMCP or the polyfill. Use it to decide whether to show tool-related UI.

```ts
import { isWebMCPAvailable } from "@web-agents/core";
```

## Signature

```ts
const isWebMCPAvailable: () => boolean;
```

## Parameters

None.

## Returns

`true` when `document` exists and `document.modelContext` is set; `false` otherwise, including on the server.

## Example

`@web-agents/react` reads it in `useWebTool` through `useSyncExternalStore`:

```ts
import { isWebMCPAvailable } from "@web-agents/core";

const supported = useSyncExternalStore(subscribeNever, isWebMCPAvailable, () => false);
```

## Notes

- It is a plain check with no events. Import `@web-agents/polyfill/auto` before calling it if you rely on the polyfill in development.

## See also

- [`registerWebTool`](./register-web-tool.md)
- [`executeTool`](./execute-tool.md)
- [WebMCP types](./webmcp-types.md)
