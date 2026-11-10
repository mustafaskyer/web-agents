import { resumable, sessionReducer } from "@webmcp-agents/chat";
import type {
  AgentStreamPart,
  SessionState,
} from "@webmcp-agents/chat";

let state: SessionState = { messages: [], status: "idle" };

// A user message, then what an adapter streams back for it.
state = sessionReducer(state, {
  type: "send",
  id: "u-1",
  text: "Add two mugs to the cart",
});
const parts: AgentStreamPart[] = [
  { type: "message-start", messageId: "a-1" },
  {
    type: "tool-call",
    messageId: "a-1",
    id: "call-1",
    name: "add_to_cart",
    input: { slug: "mug", qty: 2 },
  },
  {
    type: "tool-result",
    id: "call-1",
    output: { content: [{ type: "text", text: "Added." }] },
  },
  {
    type: "error",
    error: "Couldn't reach the assistant.",
    code: "network",
  },
];
for (const part of parts) {
  state = sessionReducer(state, { type: "part", part });
}

console.log(state.status); // "error"
// What Retry sends: through the finished add_to_cart call.
console.log(resumable(state.messages).length); // 2
