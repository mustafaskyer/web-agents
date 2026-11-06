import { useCallback, useState } from "react";

/** Time for the browser to deliver a settled response before a tool may change. */
const RESPONSE_GRACE_MS = 500;

/**
 * Chrome cancels a tool call whose definition changes mid-flight ("Tool
 * execution cancelled, since tool definition was updated"), and unmounting or
 * un-naming a declarative form changes it. When a tool's own action makes it
 * disappear (placing the order empties the cart, applying a code hides the
 * promo form), keep it in place until the agent has its answer.
 *
 * Returns `answering` (true from submit until shortly after the response
 * settles) and `answer`, which wraps respondWith.
 */
export function useAnswerGrace() {
  const [answering, setAnswering] = useState(false);

  const answer = useCallback((event: SubmitEvent, result: Promise<unknown>) => {
    if (!event.agentInvoked) return;
    setAnswering(true);
    event.respondWith?.(result);
    void result.finally(() => setTimeout(() => setAnswering(false), RESPONSE_GRACE_MS));
  }, []);

  return { answering, answer };
}
