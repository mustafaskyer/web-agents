import {
  buildSystemPrompt,
  createChatHandler,
  DEFAULT_SYSTEM_PROMPT,
} from "@webmcp-agents/chat/server";

// Your own base prompt: keep the default's per-code guidance and
// add what is true of the whole site. Never page-supplied text.
const system = `${DEFAULT_SYSTEM_PROMPT}

- This is Field Store. Prices are in USD.`;

export const handler = createChatHandler({ system });

// The prompt a request gets, built by hand (the handler does this).
console.log(
  buildSystemPrompt(
    system,
    "/cart",
    ["Read the cart before you change it."],
    true,
  ),
);
