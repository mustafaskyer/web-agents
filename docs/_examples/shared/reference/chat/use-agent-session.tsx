import {
  createCloudAdapter,
  useAgentSession,
} from "@webmcp-agents/chat";

import { shopper } from "@/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Once, at module scope.
const cloud = createCloudAdapter();

// Under <WebAgentsProvider>, so the agent's tools are on the page.
export function MiniChat() {
  const chat = useAgentSession(cloud, {
    agent: shopper,
    storageKey: false,
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        chat.send(String(data.get("q")));
        event.currentTarget.reset();
      }}
    >
      {chat.messages.map((message) => (
        <p key={message.id}>
          {message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("")}
        </p>
      ))}

      {chat.status === "error" && (
        <Button type="button" onClick={chat.retry}>
          Try again
        </Button>
      )}

      <Input
        name="q"
        aria-label="Message"
        disabled={chat.adapterStatus.state !== "ready"}
      />
    </form>
  );
}
