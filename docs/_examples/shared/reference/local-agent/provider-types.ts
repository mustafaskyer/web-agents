import {
  createLocalAdapter,
  type LocalProvider,
} from "@webmcp-agents/local-agent";

// An engine that only echoes: enough to see the contract. A provider
// generates; the loop owns tools, validation and the conversation.
const echo: LocalProvider = {
  id: "echo",
  label: "Echo",
  async availability() {
    return { state: "available" };
  },
  async prepare() {},
  async generate(req) {
    const last = req.messages.findLast((turn) => turn.role === "user");
    return { text: `You said: ${last?.content ?? ""}` };
  },
};

export const adapter = createLocalAdapter({ providers: [echo] });
