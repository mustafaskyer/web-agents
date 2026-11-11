/**
 * Server-only configuration. `server-only` makes importing this from a client component a build error, and the taint
 * makes passing the key's value to a client component a runtime error: two fences around the one secret.
 */
import "server-only";
import { experimental_taintUniqueValue as taintUniqueValue } from "react";

export const env = {
  /** The model's key (Anthropic by default; see WEB_AGENTS_MODEL in .env.example). */
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.WEB_AGENTS_MODEL ?? "anthropic/claude-sonnet-5-5",
};

if (env.anthropicKey) {
  // React refuses to serialize this exact string to the client for the lifetime of `process`
  taintUniqueValue("The API key never leaves the server. Call /api/chat instead.", process, env.anthropicKey);
}
