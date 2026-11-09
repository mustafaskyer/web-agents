---
"@webmcp-agents/core": patch
"@webmcp-agents/chat": minor
"@webmcp-agents/local-agent": minor
---

- core: a string `target` that matches nothing now falls back to the `[toolname]` element, for the cursor and the confirmation click. `target` is documented as rarely needed.
- chat: `webAgentsChatDev` refuses to start when a `VITE_*` variable is named like a secret (`secretGuard`); `AdapterStatus.loading` carries `progress`; adapters can offer `models()` / `selectModel()` and the widget shows a model picker.
- local-agent: a model already on the device loads with the status `loading`, never `downloading`; the cache check asks transformers.js (`ModelRegistry.is_pipeline_cached`) instead of a localStorage hint; `createLocalAdapter({ models, dtype })` offers several models to pick from; `MODELS` entries gain `label` and `brief`; `DEFAULT_MODEL` replaces the `DEFAULT_GPU_MODEL` / `DEFAULT_CPU_MODEL` aliases (kept, deprecated).
