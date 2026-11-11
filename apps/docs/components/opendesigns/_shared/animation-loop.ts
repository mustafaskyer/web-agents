export interface FrameScheduler {
  request: (callback: (now: number) => void) => number;
  cancel: (id: number) => void;
}
/** Owns exactly one scheduled frame. Inactive time never advances the simulation. */
export const createAnimationLoop = (
  scheduler: FrameScheduler,
  render: (seconds: number, delta: number) => void
) => {
  let frame: number | undefined;
  let last: number | undefined;
  let seconds = 0;
  let active = false;
  let disposed = false;
  const tick = (now: number) => {
    frame = undefined;
    if (!active || disposed) {
      return;
    }
    const delta = last === undefined ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    seconds += delta;
    render(seconds, delta);
    if (active && !disposed) {
      frame = scheduler.request(tick);
    }
  };
  return {
    dispose() {
      disposed = true;
      active = false;
      if (frame !== undefined) {
        scheduler.cancel(frame);
        frame = undefined;
      }
    },
    setActive(value: boolean) {
      if (disposed || active === value) {
        return;
      }
      active = value;
      last = undefined;
      if (frame !== undefined) {
        scheduler.cancel(frame);
        frame = undefined;
      }
      if (active) {
        frame = scheduler.request(tick);
      }
    },
    snapshot(value = seconds) {
      seconds = value;
      last = undefined;
      render(seconds, 0);
    },
  };
};
