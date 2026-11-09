// oxlint-disable promise/prefer-await-to-callbacks -- RAF is a synchronous callback scheduling contract.
import type { FrameScheduler } from "./animation-loop";

/** Independent animation owners share one native frame without sharing simulation state. */
export const createFrameScheduler = (
  native: FrameScheduler
): FrameScheduler => {
  let next = 0;
  let frame: number | undefined;
  const callbacks = new Map<number, (now: number) => void>();
  const pump = () => {
    if (frame !== undefined || !callbacks.size) {
      return;
    }
    frame = native.request((now) => {
      frame = undefined;
      // Snapshot IDs so work scheduled during a callback starts on the next frame.
      const pending = [...callbacks.keys()];
      try {
        for (const id of pending) {
          const callback = callbacks.get(id);
          callbacks.delete(id);
          // oxlint-disable-next-line node/callback-return -- Each frame owner receives the same timestamp.
          callback?.(now);
        }
      } finally {
        pump();
      }
    });
  };
  return {
    cancel(id) {
      callbacks.delete(id);
      if (!callbacks.size && frame !== undefined) {
        native.cancel(frame);
        frame = undefined;
      }
    },
    request(callback) {
      next += 1;
      callbacks.set(next, callback);
      pump();
      return next;
    },
  };
};

// Browser APIs are resolved only when used: importing portable source is SSR-safe.
export const frameScheduler = createFrameScheduler({
  cancel: (id) => cancelAnimationFrame(id),
  request: (callback) => requestAnimationFrame(callback),
});
