import type { AgentAdapter } from "@webmcp-agents/chat";

// A minimal adapter: no model. It calls the page's first tool, then
// says what happened. Pass it to <AgentChat adapter={echo} />.
export const echo: AgentAdapter = {
  id: "echo",
  label: "Echo",
  status: () => ({ state: "ready" }),

  async *run(req) {
    const messageId = crypto.randomUUID();
    yield { type: "message-start", messageId };

    // Read tools fresh: they change as the page changes.
    const tool = req.tools[0];
    if (tool) {
      const id = crypto.randomUUID();
      const call = { id, name: tool.name, input: {} };
      yield { type: "tool-call", messageId, ...call };

      // One tool at a time (one page, one cursor). Never rejects.
      const output = await req.callTool(call);
      const text = output.content[0]?.text ?? "";
      yield output.isError
        ? { type: "tool-error", id, error: text }
        : { type: "tool-result", id, output };
    }

    const delta = `This page has ${req.tools.length} tools.`;
    yield { type: "text-delta", messageId, delta };
    yield { type: "finish", reason: "stop" };
  },
};
