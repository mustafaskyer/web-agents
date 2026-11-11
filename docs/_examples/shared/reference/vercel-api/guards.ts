import { createChatHandler } from "@webmcp-agents/chat/server";
import {
  budgetGuard,
  composeGuards,
  createLimiter,
  originGuard,
  rateLimitGuard,
} from "@webmcp-agents/vercel-api";

const env = process.env;

// How createVercelChatRoute wires them.
export const handler = createChatHandler({
  env,
  model: "anthropic/claude-sonnet-5-5",
  // Before anything else: refuse a stranger or a burst.
  guard: composeGuards(
    originGuard(),
    rateLimitGuard(
      createLimiter({
        env,
        prefix: "shop:minute",
        limit: 30,
        window: "1 m",
        failOpen: true,
      }),
    ),
  ),
  // After validation, so malformed requests never use the budget.
  beforeModel: budgetGuard(
    createLimiter({
      env,
      prefix: "shop:global",
      limit: 3000,
      window: "1 d",
      failOpen: false,
    }),
  ),
});
