/**
 * Motion primitives for the ghost cursor. Pure math, no DOM.
 *
 * The cursor never teleports between CSS states. A "carrot" travels along a
 * curved path with a human reaching profile, and the visible cursor follows
 * the carrot through a spring. That gives three things a CSS transition can't:
 *   - curved paths, like a wrist pivoting, not a plotter
 *   - momentum: retargeting mid-flight bends the path instead of restarting it
 *   - a tiny overshoot and settle on arrival
 */

export interface Vec {
  x: number;
  y: number;
}

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const distance = (a: Vec, b: Vec): number => Math.hypot(b.x - a.x, b.y - a.y);
export const random = (min: number, max: number): number => min + Math.random() * (max - min);

/** Damped harmonic oscillator (unit mass), integrated with semi-implicit Euler. */
export class Spring {
  value: number;
  target: number;
  velocity = 0;

  constructor(
    value: number,
    readonly stiffness: number,
    readonly damping: number,
  ) {
    this.value = this.target = value;
  }

  step(dt: number): void {
    const accel = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += accel * dt;
    this.value += this.velocity * dt;
  }

  snap(value: number = this.target): void {
    this.value = this.target = value;
    this.velocity = 0;
  }

  isAtRest(epsilon = 0.05): boolean {
    return Math.abs(this.value - this.target) < epsilon && Math.abs(this.velocity) < epsilon * 10;
  }
}

/** A group of springs that share a config: a point, a rect, anything. */
export class SpringSet<K extends string> {
  private readonly springs: Record<K, Spring>;

  constructor(initial: Record<K, number>, stiffness: number, damping: number) {
    this.springs = Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, new Spring(v as number, stiffness, damping)]),
    ) as Record<K, Spring>;
  }

  get(key: K): number {
    return this.springs[key].value;
  }

  velocity(key: K): number {
    return this.springs[key].velocity;
  }

  setTarget(target: Record<K, number>): void {
    for (const k in target) this.springs[k].target = target[k];
  }

  snap(to: Record<K, number>): void {
    for (const k in to) this.springs[k].snap(to[k]);
  }

  /** Fixed sub-steps keep stiff springs stable on slow frames. */
  step(dt: number): void {
    const SUB = 1 / 240;
    for (let t = dt; t > 0; t -= SUB) {
      const h = Math.min(SUB, t);
      for (const k in this.springs) this.springs[k].step(h);
    }
  }

  isAtRest(epsilon?: number): boolean {
    for (const k in this.springs) if (!this.springs[k].isAtRest(epsilon)) return false;
    return true;
  }
}

/**
 * Minimum-jerk profile: the smoothest point-to-point movement, and a close
 * match for how people reach for things. Fast start, long gentle landing.
 */
export const minimumJerk = (t: number): number => t * t * t * (10 + t * (-15 + 6 * t));

/**
 * A point on a quadratic arc from `from` to `to`. The control point sits 40%
 * along the chord, pushed sideways by `bend` × length, so the curve is
 * asymmetric: it bows early and lands straight.
 */
export function arcPoint(from: Vec, to: Vec, bend: number, s: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const cx = from.x + dx * 0.4 - dy * bend;
  const cy = from.y + dy * 0.4 + dx * bend;
  const u = 1 - s;
  return {
    x: u * u * from.x + 2 * u * s * cx + s * s * to.x,
    y: u * u * from.y + 2 * u * s * cy + s * s * to.y,
  };
}

/** Fitts's law: far and small targets take longer, near and big ones are quick. */
export function travelTime(dist: number, targetSize: number): number {
  return clamp(130 + 95 * Math.log2(1 + dist / Math.max(targetSize, 16)), 180, 650);
}
