import {
  modelAvailability,
  providerOptionsFor,
  resolveModel,
} from "@webmcp-agents/chat/server";

// Keys stay on the server: .env.local has OPENAI_API_KEY=…
const id = "openai/gpt-5.5";

// Synchronous; loads no SDK. Says which variable to set.
const check = modelAvailability(id, process.env);
if (!check.enabled) throw new Error(check.message);

// Loads @ai-sdk/openai once and builds the model.
const { model, provider } = await resolveModel(id, process.env);

// The reasoning level, spelled the provider's way.
console.log(providerOptionsFor(provider, "low"));
// { openai: { reasoningEffort: "low", reasoningSummary: "auto" } }
console.log(provider, model);
