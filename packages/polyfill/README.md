# @webmcp-agents/polyfill

A `document.modelContext` (WebMCP) polyfill for development and browsers without native support, including
declarative `<form toolname>` tools. It steps aside when the browser has the real API.

```sh
pnpm add -D @webmcp-agents/polyfill
```

```ts
if (import.meta.env.DEV) await import("@webmcp-agents/polyfill/auto"); // before your app renders
```

## Docs

- [Browsers without WebMCP](https://github.com/mustafaskyer/web-agents/blob/main/docs/guides/polyfill.mdx): what it covers and how it differs from Chrome
- [API reference](https://github.com/mustafaskyer/web-agents/blob/main/docs/reference/polyfill/README.md)
