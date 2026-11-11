---
"@webmcp-agents/chat": minor
---

- `useAgentChat()`: the chat as a `useChat`-shaped hook with AI SDK `UIMessage`s, `ChatStatus` names, the adapter switcher, local models and `toolPhase(part)` (a call parked on the page, a sub-agent's nested run). `<AgentChat>` is now built on it. `toUIMessages` gains a `forRendering` mode.
