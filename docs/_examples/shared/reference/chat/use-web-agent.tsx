import { useWebAgent } from "@webmcp-agents/chat";

import { shopper } from "@/agents";
import { Button } from "@/components/ui/button";

// Under <WebAgentsProvider>, so the agent's tools are on the page.
export function Reorder() {
  const agent = useWebAgent(shopper);

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        onClick={() => agent.invoke("Reorder my last purchase.")}
        disabled={agent.status === "running"}
      >
        {agent.status === "running" ? "Working…" : "Reorder"}
      </Button>

      <ul>
        {agent.steps.map((step) => (
          <li key={step.id}>
            {step.tool}: {step.state}
            {step.prompt && ` (${step.prompt})`}
          </li>
        ))}
      </ul>

      {agent.status === "waiting" && <p>Click to confirm.</p>}
      {agent.error && <p role="alert">{agent.error.message}</p>}
      {agent.text && <p>{agent.text}</p>}
    </div>
  );
}
