---
"@webmcp-agents/chat": minor
"@webmcp-agents/local-agent": minor
---

- chat: `defineWebAgent` (new `@webmcp-agents/chat/agent` entry): one agent definition (instructions, a tool subset, sub-agents, a model id, maxSteps) shared by the browser and the server. `<AgentChat agent>` / `useAgentSession(adapter, { agent })` filter the page's tools through it and run sub-agents as nested `delegate_to_<id>` runs on the same adapter. `createChatHandler({ agents })` looks agents up by id (the page never sends instructions) and runs each request with an AI SDK `ToolLoopAgent` (`toToolLoopAgent`); `prepareAgent` tunes it.
- chat: any frontier model from one string: `model: "<provider>/<model>"` resolved by `resolveModel` with the provider's optional `@ai-sdk/*` package (anthropic, openai, google, deepseek, xai, mistral), `@openrouter/ai-sdk-provider` (`openrouter/<vendor>/<model>`), or the AI Gateway; provider-neutral `reasoning` (the Anthropic `effort` option is deprecated); GET reports `provider` and `agents`; 503s name the env var to set; tool-call provider metadata round-trips. The cloud adapter labels itself after the endpoint's model and takes an `id`. `webAgentsChatDev` forwards every `*_API_KEY`, `AI_GATEWAY_*` and `WEB_AGENTS_*` variable and takes `agents`.
- local-agent: the page's agent (`req.agent`) wins over `createLocalAdapter({ instructions, maxSteps })`; a delegation note is added when it has sub-agents.
