import { defineConfig } from "tsdown";

const WORKER_SOURCE = 'new URL("./worker.ts", import.meta.url)';

export default defineConfig({
  // index: main thread (no transformers.js); worker: the only entry that loads transformers.js / ONNX Runtime
  entry: { index: "src/index.ts", worker: "src/providers/transformers/worker.ts" },
  format: "esm",
  platform: "browser",
  dts: true,
  publint: true,
  plugins: [
    {
      // The source points at worker.ts beside it (Vite bundles it in dev); the build emits dist/worker.js beside index.js.
      name: "web-agents:worker-url",
      renderChunk(code) {
        if (!code.includes(WORKER_SOURCE)) return null;
        return code.replace(WORKER_SOURCE, 'new URL("./worker.js", import.meta.url)');
      },
    },
  ],
});
