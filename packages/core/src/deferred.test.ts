import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallTracker, deferRelease, RESPONSE_GRACE_MS } from "./deferred";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("deferRelease", () => {
  it("releases on a later macrotask, not synchronously", () => {
    const release = vi.fn();
    deferRelease(release);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(release).toHaveBeenCalledOnce();
  });

  it("does nothing once cancelled in the same tick (StrictMode remount)", () => {
    const release = vi.fn();
    deferRelease(release).cancel();
    vi.advanceTimersByTime(1000);
    expect(release).not.toHaveBeenCalled();
  });

  it("waits while busy, re-checking every graceMs", () => {
    const release = vi.fn();
    let busy = true;
    deferRelease(release, { isBusy: () => busy, graceMs: 100 });
    vi.advanceTimersByTime(250);
    expect(release).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(100);
    expect(release).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1000);
    expect(release).toHaveBeenCalledOnce();
  });
});

describe("createCallTracker", () => {
  it("is busy during a call and for the answer grace after it", async () => {
    const calls = createCallTracker();
    expect(calls.busy()).toBe(false);
    let finish!: () => void;
    const pending = calls.track(() => new Promise<void>((r) => (finish = r)));
    expect(calls.busy()).toBe(true);
    finish();
    await pending;
    expect(calls.busy()).toBe(true);
    vi.advanceTimersByTime(RESPONSE_GRACE_MS);
    expect(calls.busy()).toBe(false);
  });

  it("counts a call that throws as settled", async () => {
    const calls = createCallTracker();
    await expect(
      calls.track(() => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    vi.advanceTimersByTime(RESPONSE_GRACE_MS);
    expect(calls.busy()).toBe(false);
  });
});
