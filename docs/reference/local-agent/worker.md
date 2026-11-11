---
description: "The transformers.js model worker."
---

# `@webmcp-agents/local-agent/worker`

The transformers.js model worker. It is the only entry that loads `@huggingface/transformers` and ONNX Runtime, so a long generation never blocks the page's main thread or the agent cursor. You import it only when your bundler cannot follow the package's own `new Worker(new URL(…, import.meta.url))`.

## Import

```ts
// as a URL
new Worker(new URL("@webmcp-agents/local-agent/worker", import.meta.url), {
  type: "module",
});
// or with Vite's ?worker suffix
import LocalWorker from "@webmcp-agents/local-agent/worker?worker";
```

The entry has no exports. Loaded as a module worker, it listens for messages from [`createTransformersProvider`](./create-transformers-provider.md) and answers them; the message protocol is internal.

## Example

With Vite, the default path needs only two settings, and the package creates its own worker:

```ts vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@webmcp-agents/local-agent", "@huggingface/transformers"],
  },
  worker: { format: "es" },
});
```

A bundler that cannot follow the worker URL hands the adapter a worker of its own:

```ts local-adapter.ts
import { createLocalAdapter } from "@webmcp-agents/local-agent";
import LocalWorker from "@webmcp-agents/local-agent/worker?worker";

const local = createLocalAdapter({ worker: () => new LocalWorker() });
```

## Options

The worker takes none. Pass it to [`createLocalAdapter`](./create-local-adapter.md) or [`createTransformersProvider`](./create-transformers-provider.md) as `worker`:

| Name | Type | Default | Description |
|---|---|---|---|
| `worker` | `Worker \| (() => Worker)` | the package's own worker | A worker instance, or a function that creates one. A function runs only when the model loads (the person's Download click, or the first message when the model is cached), so the worker never starts on import. |

## Notes

- Inside the worker, transformers.js uses the browser cache (`env.useBrowserCache = true`) and never local models (`env.allowLocalModels = false`).
- Generations run one at a time per worker. Stop interrupts the running one.
- The package's default worker is spawned as a module worker named `web-agents-local-model`.
- If the worker crashes, the provider terminates it and frees the page slot and the browser lock; pending calls fail with "The model worker crashed." (or the error's message).
- An instance you create yourself exists as soon as your code creates it; prefer the function form.

## See also

- [On-device agent](../../more/on-device-agent.mdx), the page that teaches it
- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createLocalAdapter`](./create-local-adapter.md)
