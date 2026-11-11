/**
 * Resolve once the person has left the pointer and keyboard alone for `quiet` ms (or `signal` aborts): the cursor
 * yields to a moving pointer, so a run of the agent's own waits for a still one.
 */
export function whenIdle(quiet: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer = window.setTimeout(done, quiet);
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    function done(): void {
      for (const type of events) window.removeEventListener(type, restart, true);
      resolve();
    }
    function restart(): void {
      clearTimeout(timer);
      timer = window.setTimeout(done, quiet);
    }
    for (const type of events) window.addEventListener(type, restart, { capture: true, passive: true });
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      done();
    });
  });
}
