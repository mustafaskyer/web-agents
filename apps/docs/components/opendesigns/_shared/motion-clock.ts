// oxlint-disable promise/prefer-await-to-callbacks -- RAF and browser timer callbacks are synchronous API contracts.
import { frameScheduler } from "./frame-scheduler";

export interface ClockScheduler {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
  now: () => number;
  setTimer: (callback: () => void, milliseconds: number) => number;
  clearTimer: (id: number) => void;
}
interface TimerTask {
  callback: () => void;
  remaining: number;
  started: number;
  native?: number;
}
const browserScheduler: ClockScheduler = {
  cancel: frameScheduler.cancel,
  clearTimer: (id) => window.clearTimeout(id),
  now: () => performance.now(),
  request: frameScheduler.request,
  setTimer: (callback, ms) => window.setTimeout(callback, ms),
};

/** One frame pump and an owned, suspendable timer queue. Virtual time excludes pauses. */
export const createMotionClock = (
  scheduler: ClockScheduler = browserScheduler
) => {
  let active = false;
  let disposed = false;
  let painted = false;
  let next = 0;
  let epoch = 0;
  let hiddenAt: number | undefined;
  let offset = 0;
  let nativeFrame: number | undefined;
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Map<number, TimerTask>();
  const now = () => (hiddenAt ?? scheduler.now()) - offset;
  const pump = () => {
    if (
      disposed ||
      nativeFrame !== undefined ||
      (!active && painted) ||
      !frames.size
    ) {
      return;
    }
    nativeFrame = scheduler.request((timestamp) => {
      nativeFrame = undefined;
      painted = true;
      const callbacks = [...frames.entries()];
      for (const [id, callback] of callbacks) {
        if (disposed) {
          break;
        }
        if (frames.has(id)) {
          frames.delete(id);
          // oxlint-disable-next-line node/callback-return -- Animation callbacks are not Node error-first callbacks.
          callback(active ? timestamp - offset : now());
        }
      }
      pump();
    });
  };
  const arm = (id: number, task: TimerTask) => {
    if (!active || disposed || task.native !== undefined) {
      return;
    }
    task.started = now();
    task.native = scheduler.setTimer(() => {
      timers.delete(id);
      if (!disposed) {
        task.callback();
      }
    }, task.remaining);
  };
  return {
    cancelFrame(id: number) {
      frames.delete(id);
      if (!frames.size && nativeFrame !== undefined) {
        scheduler.cancel(nativeFrame);
        nativeFrame = undefined;
      }
    },
    clearTimer(id: number) {
      const task = timers.get(id);
      if (task?.native !== undefined) {
        scheduler.clearTimer(task.native);
      }
      timers.delete(id);
    },
    dispose() {
      disposed = true;
      active = false;
      epoch += 1;
      if (nativeFrame !== undefined) {
        scheduler.cancel(nativeFrame);
        nativeFrame = undefined;
      }
      for (const task of timers.values()) {
        if (task.native !== undefined) {
          scheduler.clearTimer(task.native);
        }
      }
      frames.clear();
      timers.clear();
    },
    get epoch() {
      return epoch;
    },
    invalidate() {
      if (disposed) {
        return;
      }
      painted = false;
      pump();
    },
    now,
    requestFrame(callback: FrameRequestCallback) {
      if (disposed) {
        return 0;
      }
      next += 1;
      frames.set(next, callback);
      pump();
      return next;
    },
    setActive(value: boolean) {
      if (disposed || value === active) {
        return;
      }
      active = value;
      if (active) {
        if (hiddenAt !== undefined) {
          offset += scheduler.now() - hiddenAt;
          hiddenAt = undefined;
        }
        pump();
        for (const [id, task] of timers) {
          arm(id, task);
        }
      } else {
        hiddenAt = scheduler.now();
        if (nativeFrame !== undefined) {
          scheduler.cancel(nativeFrame);
          nativeFrame = undefined;
        }
        for (const task of timers.values()) {
          if (task.native !== undefined) {
            task.remaining = Math.max(
              0,
              task.remaining - (now() - task.started)
            );
            scheduler.clearTimer(task.native);
            task.native = undefined;
          }
        }
      }
    },
    setTimer(callback: () => void, milliseconds: number) {
      if (disposed) {
        return 0;
      }
      next += 1;
      const task = {
        callback,
        remaining: Math.max(0, milliseconds),
        started: now(),
      };
      timers.set(next, task);
      arm(next, task);
      return next;
    },
    start() {
      disposed = false;
      active = false;
      painted = false;
      epoch += 1;
      offset = 0;
      hiddenAt = scheduler.now();
    },
  };
};
