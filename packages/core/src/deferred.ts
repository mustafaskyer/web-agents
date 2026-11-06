/**
 * Chrome cancels a tool call whose definition changes mid-flight ("Tool
 * execution cancelled, since tool definition was updated"), and unregistering
 * a tool changes it. React also unmounts and remounts on purpose (StrictMode,
 * route transitions), running effect cleanup and setup back to back. So
 * nothing that unregisters a tool may do it synchronously: it waits a
 * macrotask (a remount cancels it), then for every in-flight call to settle,
 * then for the browser to deliver the answer.
 */

/** Time for the browser to deliver a settled response before a tool may change, in ms. */
export const RESPONSE_GRACE_MS = 500;

/** Minimum busy re-check interval, in ms. */
const MIN_POLL_MS = 50;

export interface DeferReleaseOptions {
  /** While this returns true, keep waiting. Default: never busy. */
  isBusy?: () => boolean;
  /** Re-check `isBusy` this often, in ms (at least 50). Default 0, i.e. 50. */
  graceMs?: number;
}

/**
 * Run `release` on a later macrotask unless `cancel()` is called first. While
 * `isBusy()` is true, re-check every `graceMs`. `release` runs at most once.
 */
export function deferRelease(release: () => void, { isBusy = () => false, graceMs = 0 }: DeferReleaseOptions = {}): { cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  const check = (): void => {
    if (isBusy()) {
      timer = setTimeout(check, Math.max(MIN_POLL_MS, graceMs));
      return;
    }
    done = true;
    release();
  };
  timer = setTimeout(check, 0);
  return {
    cancel() {
      if (done) return;
      done = true;
      clearTimeout(timer);
    },
  };
}

/** Counts a tool's calls, so its unregistration can wait for them (see `deferRelease`). */
export interface CallTracker {
  /** Run one call and count it until it settles. */
  track<T>(call: () => T | Promise<T>): Promise<T>;
  /** True while a call runs, and for `RESPONSE_GRACE_MS` after the last one settled. */
  busy(): boolean;
}

export function createCallTracker(): CallTracker {
  let running = 0;
  let settledAt = Number.NEGATIVE_INFINITY;
  return {
    async track(call) {
      running++;
      try {
        return await call();
      } finally {
        running--;
        settledAt = Date.now();
      }
    },
    busy: () => running > 0 || Date.now() - settledAt < RESPONSE_GRACE_MS,
  };
}
