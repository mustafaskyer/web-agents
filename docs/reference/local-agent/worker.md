# `@webmcp-agents/local-agent/worker`

The transformers.js model worker. It is the only entry that loads `@huggingface/transformers` and ONNX Runtime, so a
long generation never blocks the page's main thread or the agent cursor. You only import it when your bundler can't
follow the package's own `new Worker(new URL(…, import.meta.url))`.

```ts
// as a URL
new Worker(new URL("@webmcp-agents/local-agent/worker", import.meta.url), { type: "module" });
// or with Vite's ?worker suffix
import LocalWorker from "@webmcp-agents/local-agent/worker?worker";
```

## Signature

The entry has no exports. Loaded as a module worker, it listens for messages from
[`createTransformersProvider`](./create-transformers-provider.md) and answers them. The message protocol is internal.

## Parameters

None. Pass the worker to `createLocalAdapter({ worker })` or `createTransformersProvider({ worker })`:

| Option | Type | Description |
|---|---|---|
| `worker` | `Worker \| (() => Worker)` | A worker instance, or a function that creates one. A function runs only when the model is prepared. |

## Returns

—

## Example

```ts
// vite.config.ts: the default path, the package creates its own worker
export default defineConfig({
  optimizeDeps: { exclude: ["@webmcp-agents/local-agent", "@huggingface/transformers"] },
  worker: { format: "es" },
});
```

```ts
// a bundler that can't follow the worker URL
import LocalWorker from "@webmcp-agents/local-agent/worker?worker";

const local = createLocalAdapter({ worker: () => new LocalWorker() });
```

## Notes

- Inside the worker, transformers.js uses the browser cache (`env.useBrowserCache = true`) and never local models
  (`env.allowLocalModels = false`).
- Generations run one at a time per worker. Stop interrupts the running one.
- The package's default worker is spawned as a module worker named `web-agents-local-model`.
- If the worker crashes, the provider terminates it and frees the page slot and the browser lock; pending calls fail
  with "The model worker crashed." (or the error's message).
- An instance exists as soon as your code creates it; a function is called only when the model loads (the person's
  Download click, or the first message with a cached model).

## See also

- [`createTransformersProvider`](./create-transformers-provider.md)
- [`createLocalAdapter`](./create-local-adapter.md)
