import { describe, expect, it } from "vitest";
import { Spring, SpringSet, arcPoint, clamp, lerp, minimumJerk, travelTime } from "./motion";

const steps = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe("minimumJerk", () => {
  it("starts at 0 and ends at 1", () => {
    expect(minimumJerk(0)).toBe(0);
    expect(minimumJerk(1)).toBe(1);
  });

  it("never moves backwards", () => {
    const values = steps(20).map(minimumJerk);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] as number);
  });

  it("is point-symmetric around the midpoint", () => {
    for (const t of steps(20)) expect(minimumJerk(t) + minimumJerk(1 - t)).toBeCloseTo(1, 10);
  });
});

describe("arcPoint", () => {
  const from = { x: 10, y: 20 };
  const to = { x: 310, y: 120 };

  it("starts at `from` and lands on `to`", () => {
    expect(arcPoint(from, to, 0.1, 0)).toEqual(from);
    expect(arcPoint(from, to, 0.1, 1)).toEqual(to);
  });

  it("bows sideways when bent, and runs straight when not", () => {
    const straight = arcPoint(from, to, 0, 0.5);
    const bent = arcPoint(from, to, 0.15, 0.5);
    expect(bent).not.toEqual(straight);
    // Straight: the midpoint sits on the chord.
    const cross = (to.x - from.x) * (straight.y - from.y) - (to.y - from.y) * (straight.x - from.x);
    expect(cross).toBeCloseTo(0, 6);
  });
});

describe("travelTime (Fitts's law)", () => {
  it("is clamped to 180–650 ms", () => {
    expect(travelTime(0, 40)).toBe(180);
    expect(travelTime(100_000, 1)).toBe(650);
  });

  it("grows with distance and shrinks with target size", () => {
    expect(travelTime(600, 40)).toBeGreaterThan(travelTime(200, 40));
    expect(travelTime(400, 120)).toBeLessThan(travelTime(400, 20));
  });
});

describe("springs", () => {
  const settle = (step: (dt: number) => void) => {
    for (let t = 0; t < 2; t += 1 / 240) step(1 / 240);
  };

  it("Spring converges on its target and reports rest", () => {
    const s = new Spring(0, 620, 44);
    s.target = 100;
    settle((dt) => s.step(dt));
    expect(s.value).toBeCloseTo(100, 1);
    expect(s.isAtRest()).toBe(true);
  });

  it("SpringSet moves every key together", () => {
    const set = new SpringSet({ x: 0, y: 0 }, 360, 34);
    set.setTarget({ x: 50, y: -30 });
    settle((dt) => set.step(dt));
    expect(set.get("x")).toBeCloseTo(50, 1);
    expect(set.get("y")).toBeCloseTo(-30, 1);
    expect(set.isAtRest()).toBe(true);
  });

  it("snap jumps without velocity", () => {
    const set = new SpringSet({ x: 0 }, 360, 34);
    set.snap({ x: 12 });
    expect(set.get("x")).toBe(12);
    expect(set.velocity("x")).toBe(0);
  });
});

describe("clamp / lerp", () => {
  it("clamps and interpolates", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});
