// oxlint-disable promise/prefer-await-to-callbacks -- Browser frame and timer schedulers expose synchronous callbacks.
import { frameScheduler } from "./frame-scheduler";
import { createAutoplayBudget } from "./use-decorative-motion";

export interface SectionSequenceScheduler {
  now: () => number;
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
  schedule: (callback: () => void, milliseconds: number) => number;
  clear: (id: number) => void;
}
const browserScheduler: SectionSequenceScheduler = {
  cancel: frameScheduler.cancel,
  clear: (id) => window.clearTimeout(id),
  now: () => performance.now(),
  request: frameScheduler.request,
  schedule: (callback, milliseconds) =>
    window.setTimeout(callback, milliseconds),
};

/** A visible-time sequence whose deadline paints its terminal state independently of RAF delivery. */
export const createSectionSequence = (
  paint: (elapsedMs: number) => void,
  durationMs = 4600,
  scheduler: SectionSequenceScheduler = browserScheduler
) => {
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 5000) {
    throw new RangeError(
      "Section motion duration must be between 0 and 5000 ms."
    );
  }
  let active = false;
  let disposed = false;
  let finished = false;
  let elapsed = 0;
  let started = 0;
  let lastPaint = -1;
  let frame: number | undefined;
  const current = () =>
    Math.min(
      durationMs,
      elapsed + (active ? Math.max(0, scheduler.now() - started) : 0)
    );
  const cancel = () => {
    if (frame !== undefined) {
      scheduler.cancel(frame);
      frame = undefined;
    }
  };
  const owned: { budget?: ReturnType<typeof createAutoplayBudget> } = {};
  const finish = () => {
    if (disposed || finished) {
      return;
    }
    finished = true;
    active = false;
    elapsed = durationMs;
    cancel();
    owned.budget?.dispose();
    paint(durationMs);
  };
  const budget = createAutoplayBudget(
    {
      cancel: scheduler.clear,
      now: scheduler.now,
      schedule: scheduler.schedule,
    },
    finish,
    durationMs
  );
  owned.budget = budget;
  const pump = () => {
    if (!active || disposed || finished || frame !== undefined) {
      return;
    }
    frame = scheduler.request(() => {
      frame = undefined;
      if (!active || disposed || finished) {
        return;
      }
      const time = current();
      if (time >= durationMs) {
        finish();
        return;
      }
      if (lastPaint < 0 || time - lastPaint >= 40) {
        lastPaint = time;
        paint(time);
      }
      pump();
    });
  };
  return {
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      active = false;
      cancel();
      budget.dispose();
    },
    finish,
    repaint() {
      if (!disposed) {
        paint(current());
      }
    },
    setActive(value: boolean) {
      if (disposed || finished || value === active) {
        return;
      }
      if (!value) {
        elapsed = current();
        active = false;
        cancel();
        budget.setActive(false);
        if (elapsed >= durationMs) {
          finish();
        }
        return;
      }
      started = scheduler.now();
      active = true;
      budget.setActive(true);
      pump();
    },
  };
};
