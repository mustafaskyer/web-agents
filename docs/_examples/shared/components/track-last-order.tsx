import { useWebAgent } from "@webmcp-agents/chat";

import { shopper } from "@/agents";
import { Button } from "@/components/ui/button";

export function TrackLastOrder() {
  const agent = useWebAgent(shopper);
  const busy = agent.status === "running" || agent.status === "waiting";

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex gap-2">
        <Button
          disabled={busy}
          onClick={() => agent.invoke("Where is my last order?")}
        >
          {busy ? "Working…" : "Track my last order"}
        </Button>

        {busy && (
          <Button variant="ghost" onClick={agent.stop}>
            Stop
          </Button>
        )}
      </div>

      {/* Each tool call, live: running, waiting for you, done. */}
      <ul className="text-sm text-muted-foreground">
        {agent.steps.map((step) => (
          <li key={step.id}>
            {step.tool}: {step.state}
          </li>
        ))}
      </ul>

      {agent.text && <p>{agent.text}</p>}

      {agent.error && <p role="alert">{agent.error.message}</p>}
    </div>
  );
}
