import { useAgentChat } from "@webmcp-agents/chat";

import { shopper } from "@/agents";
import { Button } from "@/components/ui/button";

// Under <WebAgentsProvider>, so the agent's tools are on the page.
export function MyChat() {
  const chat = useAgentChat({ agent: shopper });

  return (
    <div className="flex flex-col gap-3">
      {chat.messages.map((message) => (
        <div key={message.id}>
          <p>
            {message.parts
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("")}
          </p>
          {message.parts.map((part) => {
            if (part.type !== "dynamic-tool") return null;

            const phase = chat.toolPhase(part);
            return (
              <p key={part.toolCallId}>
                {phase?.phase === "parked"
                  ? `Confirm on the page: ${phase.prompt}`
                  : `${part.toolName}: ${phase?.phase}`}
              </p>
            );
          })}
        </div>
      ))}

      {chat.suggestions.map((text) => (
        <Button
          key={text}
          variant="outline"
          onClick={() => chat.sendMessage({ text })}
        >
          {text}
        </Button>
      ))}

      {chat.status === "streaming" && (
        <Button onClick={chat.stop}>Stop</Button>
      )}
      {chat.status === "error" && (
        <Button onClick={chat.regenerate}>Try again</Button>
      )}
    </div>
  );
}
