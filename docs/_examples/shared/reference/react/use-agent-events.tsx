import { useAgentEvents } from "@webmcp-agents/react";
import { useState } from "react";

// A line of status text that follows what the agent is doing.
export function AgentStatus() {
  const [status, setStatus] = useState("The agent is idle.");

  useAgentEvents((event) => {
    if (event.type === "start") setStatus(`Running ${event.tool}…`);
    if (event.type === "park") setStatus(event.prompt);
    if (event.type === "result")
      setStatus(`${event.tool} took ${Math.round(event.ms)} ms.`);
    if (event.type === "error") setStatus(event.error);
    if (event.type === "yield") setStatus("You took over.");
  });

  return <p aria-live="polite">{status}</p>;
}
