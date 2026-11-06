/** Small pieces several modules agree on. Pure: the server imports them too. */

/** What a cancelled tool call answers; the session shows such a call as cancelled, not failed. */
export const CANCELLED = "Cancelled by the user.";

/** True for a tool error that is a cancellation. */
export const isCancelled = (text: string): boolean => text.startsWith(CANCELLED);

let counter = 0;
/** A unique message id: `prefix-<time>-<n>`. */
export const newId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Caps on a request. Generous enough for long chats (the client trims the oldest messages past `messages`). */
export const LIMITS = {
  bodyBytes: 1024 * 1024,
  messages: 160,
  parts: 40,
  text: 8000,
  reasoning: 32_000,
  tools: 48,
  description: 1024,
  schemaBytes: 8192,
} as const;
