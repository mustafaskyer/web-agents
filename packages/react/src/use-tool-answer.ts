/**
 * Chrome cancels a tool call whose definition changes mid-flight ("Tool
 * execution cancelled, since tool definition was updated"), and unmounting or
 * un-naming a declarative form changes it. When a tool's own action makes it
 * disappear (placing the order empties the cart, applying a code hides the
 * promo form), keep it in place until the agent has its answer.
 */
import { RESPONSE_GRACE_MS } from "@web-agents/core";
import { useCallback, useState } from "react";

export interface ToolAnswer {
  /** True from an agent's submit until shortly after its response settles: keep the form rendered meanwhile. */
  answering: boolean;
  /** Answer an agent-invoked submit (wraps `respondWith`). Does nothing for a person's submit. */
  answer(event: SubmitEvent, result: Promise<unknown>): void;
}

/** For declarative `<form toolname>` tools whose own action hides them. */
export function useToolAnswer(): ToolAnswer {
  const [answering, setAnswering] = useState(false);

  const answer = useCallback((event: SubmitEvent, result: Promise<unknown>) => {
    if (!event.agentInvoked) return;
    setAnswering(true);
    event.respondWith?.(result);
    // then(f, f), not finally: a rejected result must not leave a second, unhandled rejection behind.
    const settle = (): void => {
      setTimeout(() => setAnswering(false), RESPONSE_GRACE_MS);
    };
    result.then(settle, settle);
  }, []);

  return { answering, answer };
}

/** @deprecated Renamed to `useToolAnswer`. */
export const useAnswerGrace = useToolAnswer;
