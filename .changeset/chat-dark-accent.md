---
"@webmcp-agents/chat": patch
---

In dark mode the chat's accent is a light tint of `--agent` with dark text on it, instead of the agent's own colour: the default near-black launcher and send button were all but invisible on the dark panel. A brand colour keeps its hue. An explicit `--wa-chat-accent` for dark now needs the dark condition in its selector.
