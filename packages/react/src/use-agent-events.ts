import { type AgentEvent, onAgentEvent } from "@web-agents/core";
import { useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect";

/** Call `listener` for every agent event (start, fill, park, result, error, cancel, yield, resume) while mounted. */
export function useAgentEvents(listener: (event: AgentEvent) => void): void {
  const latest = useRef(listener);
  useIsomorphicLayoutEffect(() => {
    latest.current = listener;
  });
  useEffect(() => onAgentEvent((e) => latest.current(e)), []);
}
