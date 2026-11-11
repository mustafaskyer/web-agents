# @webmcp-agents/local-agent

## 0.2.0

### Minor Changes

- [#1](https://github.com/webmcp-agents/webmcp-agents/pull/1) [`cd314a7`](https://github.com/webmcp-agents/webmcp-agents/commit/cd314a7c53ea6fe601f609dae0a38ac0b628d841) Thanks [@mustafaskyer](https://github.com/mustafaskyer)! - - chat: `defineWebAgent` (new `@webmcp-agents/chat/agent` entry): one agent definition (instructions, a tool subset, sub-agents, a model id, maxSteps) shared by the browser and the server. `<AgentChat agent>` / `useAgentSession(adapter, { agent })` filter the page's tools through it and run sub-agents as nested `delegate_to_<id>` runs on the same adapter. `createChatHandler({ agents })` looks agents up by id (the page never sends instructions) and runs each request with an AI SDK `ToolLoopAgent` (`toToolLoopAgent`); `prepareAgent` tunes it.
  - chat: any frontier model from one string: `model: "<provider>/<model>"` resolved by `resolveModel` with the provider's optional `@ai-sdk/*` package (anthropic, openai, google, deepseek, xai, mistral), `@openrouter/ai-sdk-provider` (`openrouter/<vendor>/<model>`), or the AI Gateway; provider-neutral `reasoning` (the Anthropic `effort` option is deprecated); GET reports `provider` and `agents`; 503s name the env var to set; tool-call provider metadata round-trips. The cloud adapter labels itself after the endpoint's model and takes an `id`. `webAgentsChatDev` forwards every `*_API_KEY`, `AI_GATEWAY_*` and `WEB_AGENTS_*` variable and takes `agents`.
  - local-agent: the page's agent (`req.agent`) wins over `createLocalAdapter({ instructions, maxSteps })`; a delegation note is added when it has sub-agents.

- [#1](https://github.com/webmcp-agents/webmcp-agents/pull/1) [`0a20fa6`](https://github.com/webmcp-agents/webmcp-agents/commit/0a20fa6c9194b3faacafc10a91d5b91c371fdc2a) Thanks [@mustafaskyer](https://github.com/mustafaskyer)! - - core: a string `target` that matches nothing now falls back to the `[toolname]` element, for the cursor and the confirmation click. `target` is documented as rarely needed.
  - chat: `webAgentsChatDev` refuses to start when a `VITE_*` variable is named like a secret (`secretGuard`); `AdapterStatus.loading` carries `progress`; adapters can offer `models()` / `selectModel()` and the widget shows a model picker.
  - local-agent: a model already on the device loads with the status `loading`, never `downloading`; the cache check asks transformers.js (`ModelRegistry.is_pipeline_cached`) instead of a localStorage hint; `createLocalAdapter({ models, dtype })` offers several models to pick from; `MODELS` entries gain `label` and `brief`; `DEFAULT_MODEL` replaces the `DEFAULT_GPU_MODEL` / `DEFAULT_CPU_MODEL` aliases (kept, deprecated).

- [#1](https://github.com/webmcp-agents/webmcp-agents/pull/1) [`27088fe`](https://github.com/webmcp-agents/webmcp-agents/commit/27088feef01c455889e391f689c8f2be9eeecbcb) Thanks [@mustafaskyer](https://github.com/mustafaskyer)! - Initial release: the agent cursor and visual layer (core), a document.modelContext polyfill, React bindings,
  devtools, a chat widget with a cloud agent, and an on-device agent.

### Patch Changes

- Updated dependencies [[`cd314a7`](https://github.com/webmcp-agents/webmcp-agents/commit/cd314a7c53ea6fe601f609dae0a38ac0b628d841), [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624), [`aa76c04`](https://github.com/webmcp-agents/webmcp-agents/commit/aa76c04583d369fefb757bbb176dd5be0a150cf5), [`0a20fa6`](https://github.com/webmcp-agents/webmcp-agents/commit/0a20fa6c9194b3faacafc10a91d5b91c371fdc2a), [`27088fe`](https://github.com/webmcp-agents/webmcp-agents/commit/27088feef01c455889e391f689c8f2be9eeecbcb), [`e02b657`](https://github.com/webmcp-agents/webmcp-agents/commit/e02b657b080039e109da16431b55374af4952624), [`d42d8a2`](https://github.com/webmcp-agents/webmcp-agents/commit/d42d8a24d62e676a9a7b3384b6a91724f83ad203)]:
  - @webmcp-agents/chat@0.2.0
