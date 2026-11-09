import { RESPONSE_GRACE_MS } from "@webmcp-agents/core";

/**
 * Run `then` (navigate away, close a panel) once the agent has its answer:
 * leaving the page unmounts the tool's form, and Chrome cancels a call whose
 * tool disappears before it answered. A person's own submit runs `then` at once.
 */
export function afterAnswer(event: SubmitEvent, result: Promise<unknown>, then: () => void): void {
  if (!event.agentInvoked) {
    then();
    return;
  }
  const later = (): void => {
    setTimeout(then, RESPONSE_GRACE_MS);
  };
  result.then(later, later);
}
