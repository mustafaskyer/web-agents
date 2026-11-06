/**
 * Ghost cursor. No knowledge of tools: just "go here", "click", "highlight
 * that", "wait for the user".
 *
 * Everything moves in one requestAnimationFrame loop, in DOCUMENT coordinates,
 * and is re-anchored to live element rects every frame. So the cursor stays
 * on its target while the page scrolls or the layout shifts, and a new
 * `moveTo` bends the current motion instead of restarting it.
 *
 * Looks: a multiplayer-style arrow with a name tag. At rest it rocks gently
 * left and right around its tip, so it reads as "alive and working" without
 * drifting off its target.
 */
import {
  type Vec,
  Spring,
  SpringSet,
  arcPoint,
  clamp,
  distance,
  minimumJerk,
  random,
  travelTime,
} from "./motion";

interface Aim {
  el: Element;
  /** Smaller targets take longer to land on (Fitts's law). */
  size: number;
  /** Where on the element to point, from its live viewport rect. */
  point(rect: DOMRect): Vec;
}

interface Travel {
  from: Vec;
  bend: number;
  start: number;
  duration: number;
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const reduced = (): boolean => reducedMotion.matches;

/** setTimeout as a promise; collapses to 0 when the user prefers reduced motion. */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : ms));

/** Pixel inside the 24×24 cursor box that sits exactly on the target: the arrow's tip. */
const HOTSPOT: Vec = { x: 4, y: 4 };
const ARROW_PATH =
  "M5.1 3.4 20.2 9.5c.8.3.8 1.4 0 1.7l-6.3 2.5-2.5 6.3c-.3.8-1.4.8-1.7 0L3.4 5.1c-.3-.9.8-2 1.7-1.7z";

const CURSOR_HTML = `
  <span class="agent-cursor__halo"></span>
  <svg class="agent-cursor__arrow" width="24" height="24" viewBox="0 0 24 24"><path d="${ARROW_PATH}"/></svg>`;

/** Name tag offset from the tip. */
const TAG_OFFSET: Vec = { x: 20, y: 18 };

/** Rocking at rest: degrees around the tip, px sideways, cycles per second. */
const SWAY = { degrees: 9, px: 2.5, hz: 1.1 };

const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", "password", "number"]);
const isTextField = (el: Element): boolean =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type));

/** Decide where to point. Small random offsets keep repeated moves from looking stamped. */
function aimAt(el: Element): Aim {
  const r = el.getBoundingClientRect();
  const size = Math.min(r.width, r.height);
  const jx = random(-0.12, 0.12);
  const jy = random(-0.15, 0.15);

  if (isTextField(el)) {
    // Over the text, where a caret would go.
    return { el, size: r.height, point: (b) => ({ x: b.left + Math.min(b.width - 12, 14 + b.width * (0.18 + jx)), y: b.top + b.height * 0.55 }) };
  }
  if (el instanceof HTMLFormElement || r.width > 280) {
    // Big container: hover near its leading edge, not dead centre.
    return { el, size, point: (b) => ({ x: b.left + Math.min(b.width / 2, 120), y: b.top + b.height / 2 }) };
  }
  return { el, size, point: (b) => ({ x: b.left + b.width * (0.5 + jx), y: b.top + b.height * (0.55 + jy) }) };
}

const docRect = (el: Element, pad = 0) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX - pad, y: r.top + scrollY - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
};

function revealIfNeeded(el: Element): void {
  const r = el.getBoundingClientRect();
  const margin = 64;
  if (r.top < margin || r.bottom > innerHeight - margin || r.left < 0 || r.right > innerWidth) {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
  }
}

const RING_PAD = 4;

/** Blur everything except the tool the cursor is working in. */
export interface SpotlightOptions {
  /** Blur radius for the rest of the page, px. Default 4. */
  blur?: number;
  /** Darkening over the rest of the page, 0–1. Default 0.08. */
  dim?: number;
  /** Clear space around the focused element, px. Default 12. */
  padding?: number;
}

const SPOTLIGHT_DEFAULTS: Required<SpotlightOptions> = { blur: 4, dim: 0.08, padding: 12 };

/** Rounded rectangle as an SVG path, for the hole in the spotlight. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

class GhostCursor {
  // ---- DOM ----
  private cursorEl!: HTMLDivElement;
  private tagEl!: HTMLDivElement;
  private ringEl!: HTMLDivElement;
  private liveEl!: HTMLDivElement;
  private spotEl!: HTMLDivElement;
  private name = "";

  // ---- physics (document px) ----
  /** The hand: stiff and nearly critically damped, so it lands fast with a hint of overshoot. */
  private pos = new SpringSet({ x: 0, y: 0 }, 620, 44);
  /** The tag trails the hand on a slightly looser spring. */
  private tag = new SpringSet({ x: 0, y: 0 }, 360, 34);
  /** The focus ring glides between the elements it frames. */
  private ring = new SpringSet({ x: 0, y: 0, w: 0, h: 0 }, 360, 36);
  /** The spotlight's clear window: softer than the ring, so focus shifts feel calm. */
  private spot = new SpringSet({ x: 0, y: 0, w: 0, h: 0 }, 150, 24);
  private spotlight: Required<SpotlightOptions> | null = null;
  private spotTarget: Element | null = null;
  /** After a click the window stops following layout shifts until the next move. */
  private spotFrozen = false;
  private spotHiddenAt = 0;
  /** Lean into horizontal movement; bounce on press. */
  private tilt = new Spring(0, 220, 26);
  private scale = new Spring(1, 760, 30);
  /** 0 while travelling, 1 at rest (more while parked). Springs, so the rocking fades in and out. */
  private sway = new Spring(0, 60, 14);
  private swayPhase = 0;

  // ---- intent ----
  private aim: Aim | null = null;
  private lastGoal: Vec = { x: 0, y: 0 };
  private travel: Travel | null = null;
  private arrival: (() => void) | null = null;
  private ringTarget: Element | null = null;
  private visible = false;
  private parked = false;
  private hiddenAt = 0;
  private tagWidth = 0;

  // ---- loop ----
  private raf = 0;
  private lastFrame = 0;

  // =====================================================================
  // public API
  // =====================================================================

  /** The name shown in the cursor's tag; empty hides the tag. */
  setName(name: string): void {
    this.name = name;
    if (this.tagEl && !this.parked) this.setTag(name);
  }

  private setTag(text: string): void {
    this.tagEl.textContent = text;
    this.tagWidth = this.tagEl.offsetWidth;
  }

  /** Turn the spotlight on (optionally with options) or off. Safe to call at any time. */
  setSpotlight(options: SpotlightOptions | boolean): void {
    this.spotlight = options === false ? null : { ...SPOTLIGHT_DEFAULTS, ...(options === true ? {} : options) };
    if (!this.spotEl) return;
    this.applySpotlightStyle();
    if (!this.spotlight) {
      this.spotEl.classList.remove("is-visible");
      this.spotTarget = null;
    }
    this.kick();
  }

  /** Glide to `el`. Resolves on arrival, or as soon as another move supersedes this one. */
  moveTo(el: Element): Promise<void> {
    this.ensure();
    revealIfNeeded(el);

    const aim = aimAt(el);
    const goal = this.goalOf(aim);
    if (!this.visible) this.appear(goal);
    this.spotFrozen = false;

    const from = { x: this.pos.get("x"), y: this.pos.get("y") };
    const dist = distance(from, goal);
    this.aim = aim;
    this.travel =
      dist < 4 || reduced()
        ? null
        : {
            from,
            bend: (Math.random() < 0.5 ? -1 : 1) * random(0.05, 0.15),
            start: performance.now(),
            duration: travelTime(dist, aim.size),
          };

    this.arrival?.();
    return new Promise((resolve) => {
      this.arrival = resolve;
      this.kick();
    });
  }

  /** Status for assistive tech. Visibly, the tag shows the agent's name (if any) or a park prompt. */
  say(text: string): void {
    this.ensure();
    if (this.liveEl.textContent !== text) this.liveEl.textContent = text;
  }

  /** Frame an element with the focus ring, or pass null to release it. */
  highlight(el: Element | null): void {
    this.ensure();
    if (el === this.ringTarget) return;
    const previous = this.ringTarget;
    this.ringTarget = el;
    if (!el) {
      this.ringEl.classList.remove("is-visible");
      return;
    }

    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 6;
    this.ringEl.style.borderRadius = `${radius + RING_PAD}px`;
    const r = docRect(el, RING_PAD);

    // Glide from the previous element if it was close; otherwise lock on from slightly wider.
    const glide =
      previous?.isConnected &&
      distance({ x: this.ring.get("x"), y: this.ring.get("y") }, r) < 360 &&
      this.ringEl.classList.contains("is-visible");
    if (!glide || reduced()) {
      const grow = reduced() ? 0 : 8;
      this.ring.snap({ x: r.x - grow, y: r.y - grow, w: r.w + grow * 2, h: r.h + grow * 2 });
    }
    this.ringEl.classList.add("is-visible");
    this.kick();
  }

  /** A glow on the ring: "this value just changed". Doesn't block. */
  flash(): void {
    if (this.ringTarget) restartAnimation(this.ringEl, "is-flashing");
  }

  /**
   * Press feedback with a ripple. `onPress` runs at the bottom of the press,
   * which is where callers release whatever the click stands for, so the page
   * reacts in the same frame as the ripple.
   */
  async click(onPress?: () => void): Promise<void> {
    this.ensure();
    this.scale.target = 0.8;
    this.kick();
    await wait(70);
    this.ripple();
    // Let go BEFORE the page reacts: the click is done, so whatever moves next
    // (a row inserted above, a cart that empties) must not drag the cursor along.
    this.release();
    onPress?.();
    this.scale.target = 1;
    await wait(120);
  }

  /**
   * Stop tracking the current element: the hand stays where it is, the ring
   * fades and the spotlight window holds still, until the next moveTo.
   */
  release(): void {
    this.aim = null;
    this.travel = null;
    this.arrival?.();
    this.arrival = null;
    this.spotFrozen = true;
    this.highlight(null);
  }

  /**
   * Hover in place while the browser waits for the user to confirm. `prompt`
   * is shown beside the cursor for as long as it waits, since without it a
   * parked cursor just looks stuck.
   */
  park(prompt: string): void {
    this.ensure();
    this.parked = true;
    this.say(prompt);
    this.setTag(prompt);
    for (const el of [this.cursorEl, this.tagEl, this.ringEl]) el.classList.add("is-waiting");
  }

  unpark(): void {
    if (!this.parked) return;
    this.parked = false;
    this.setTag(this.name);
    for (const el of [this.cursorEl, this.tagEl, this.ringEl]) el.classList.remove("is-waiting");
  }

  async hide(): Promise<void> {
    if (!this.visible) return;
    this.visible = false;
    this.hiddenAt = performance.now();
    this.travel = null;
    this.arrival?.();
    this.arrival = null;
    this.highlight(null);
    this.unpark();
    this.cursorEl.classList.remove("is-visible");
    this.tagEl.classList.remove("is-visible");
    this.spotEl.classList.remove("is-visible");
    this.spotTarget = null;
    this.spotHiddenAt = performance.now();
    this.scale.target = 0.6;
    this.kick();
    await wait(220);
  }

  // =====================================================================
  // internals
  // =====================================================================

  private ensure(): void {
    if (this.cursorEl) return;
    const div = (className: string): HTMLDivElement => Object.assign(document.createElement("div"), { className });

    this.cursorEl = div("agent-cursor");
    this.cursorEl.innerHTML = CURSOR_HTML;
    this.cursorEl.setAttribute("aria-hidden", "true");

    this.tagEl = div("agent-tag");
    this.tagEl.setAttribute("aria-hidden", "true");
    this.tagEl.textContent = this.name;

    this.ringEl = div("agent-ring");
    this.ringEl.setAttribute("aria-hidden", "true");
    this.ringEl.addEventListener("animationend", () => this.ringEl.classList.remove("is-flashing"));

    this.liveEl = div("agent-sr-only");
    this.liveEl.setAttribute("role", "status");

    this.spotEl = div("agent-spotlight");
    this.spotEl.setAttribute("aria-hidden", "true");
    this.applySpotlightStyle();

    document.body.append(this.spotEl, this.ringEl, this.tagEl, this.cursorEl, this.liveEl);
    this.tagWidth = this.tagEl.offsetWidth;
  }

  private applySpotlightStyle(): void {
    const o = this.spotlight ?? SPOTLIGHT_DEFAULTS;
    this.spotEl.style.setProperty("--agent-spot-blur", `${o.blur}px`);
    this.spotEl.style.setProperty("--agent-spot-dim", String(o.dim));
  }

  /** First show: drift in from just below-right of the target, or resume from where we left off. */
  private appear(goal: Vec): void {
    const resumed = this.hiddenAt > 0 && performance.now() - this.hiddenAt < 1500;
    if (!resumed) {
      const start = { x: goal.x + random(40, 70), y: goal.y + random(40, 70) };
      this.pos.snap(start);
      this.tag.snap(this.tagGoal(start));
    }
    this.scale.snap(reduced() ? 1 : 0.6);
    this.scale.target = 1;
    this.visible = true;
    this.cursorEl.classList.add("is-visible");
    this.tagEl.classList.add("is-visible");
  }

  private goalOf(aim: Aim): Vec {
    if (!aim.el.isConnected) return this.lastGoal; // re-rendered away: hold position
    const p = aim.point(aim.el.getBoundingClientRect());
    this.lastGoal = { x: p.x + scrollX, y: p.y + scrollY };
    return this.lastGoal;
  }

  /** Below-right of the tip, flipped to the left near the viewport's right edge. */
  private tagGoal(tip: Vec): Vec {
    const flip = tip.x - scrollX + TAG_OFFSET.x + this.tagWidth > innerWidth - 8;
    return {
      x: flip ? tip.x - this.tagWidth - 6 : tip.x + TAG_OFFSET.x,
      y: clamp(tip.y + TAG_OFFSET.y, scrollY + 8, scrollY + innerHeight - 32),
    };
  }

  private kick(): void {
    if (this.raf) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    const dt = clamp((now - this.lastFrame) / 1000, 0, 1 / 20);
    this.lastFrame = now;
    this.update(now, dt);
    this.render();

    const fading = now - this.hiddenAt < 520;
    this.raf = this.visible || fading || !this.scale.isAtRest(0.002) ? requestAnimationFrame(this.frame) : 0;
  };

  private update(now: number, dt: number): void {
    const still = reduced();

    // 1. Where is the hand headed this frame?
    let carrot: Vec = { x: this.pos.get("x"), y: this.pos.get("y") };
    if (this.aim && this.visible) {
      const goal = this.goalOf(this.aim);
      if (this.travel) {
        const s = clamp((now - this.travel.start) / this.travel.duration, 0, 1);
        carrot = arcPoint(this.travel.from, goal, this.travel.bend, minimumJerk(s));
        if (s >= 1) this.travel = null;
      } else {
        carrot = goal;
      }
    }

    // 2. Physics.
    this.pos.setTarget(carrot);
    if (still) this.pos.snap(carrot);
    else this.pos.step(dt);
    const tip = { x: this.pos.get("x"), y: this.pos.get("y") };

    if (this.arrival && !this.travel && distance(tip, carrot) < 2.5) {
      const resolve = this.arrival;
      this.arrival = null;
      resolve();
    }

    // 3. Rocking: fades in once the hand has settled, fades out the moment it moves.
    const settled = !this.travel && distance(tip, carrot) < 6;
    this.sway.target = still || !this.visible || !settled ? 0 : this.parked ? 1.35 : 1;
    this.stepSpring(this.sway, dt, still);
    this.swayPhase = (this.swayPhase + dt * SWAY.hz * Math.PI * 2) % (Math.PI * 2);

    this.tilt.target = clamp(this.pos.velocity("x") * 0.008, -10, 10);
    this.stepSpring(this.tilt, dt, still);
    this.stepSpring(this.scale, dt, still);

    // 4. Tag trails the tip.
    const tagGoal = this.tagGoal(tip);
    this.tag.setTarget(tagGoal);
    if (still) this.tag.snap(tagGoal);
    else this.tag.step(dt);

    // 5. Ring follows its element.
    if (this.ringTarget?.isConnected) {
      const r = docRect(this.ringTarget, RING_PAD);
      this.ring.setTarget(r);
      if (still) this.ring.snap(r);
      else this.ring.step(dt);
    }

    // 6. Spotlight frames the whole tool being worked in, not just one field,
    //    so it stays put while the cursor moves between a field and its button.
    if (this.spotlight && this.visible && !this.spotFrozen) {
      const focus = this.ringTarget ?? this.aim?.el ?? null;
      const target = focus?.closest("[toolname]") ?? focus;
      if (target?.isConnected) {
        const r = docRect(target, this.spotlight.padding);
        // A fresh show snaps into place; back-to-back calls glide from the last window.
        const recent = this.spotHiddenAt > 0 && now - this.spotHiddenAt < 1500;
        if (still || (!this.spotTarget && !recent)) this.spot.snap(r);
        else this.spot.setTarget(r);
        if (!this.spotTarget) this.spotEl.classList.add("is-visible");
        this.spotTarget = target;
      }
    }
    if (this.spotTarget && !still) this.spot.step(dt);
  }

  private stepSpring(s: Spring, dt: number, still: boolean): void {
    if (still) return s.snap();
    const SUB = 1 / 240;
    for (let t = dt; t > 0; t -= SUB) s.step(Math.min(SUB, t));
  }

  private render(): void {
    const sx = scrollX;
    const sy = scrollY;
    const amp = Math.max(0, this.sway.value);
    const wave = Math.sin(this.swayPhase);
    const rock = amp * SWAY.degrees * wave;
    const shift = amp * SWAY.px * Math.sin(this.swayPhase - 0.5);

    this.cursorEl.style.transform =
      `translate3d(${this.pos.get("x") - sx - HOTSPOT.x + shift}px, ${this.pos.get("y") - sy - HOTSPOT.y}px, 0) ` +
      `rotate(${this.tilt.value + rock}deg) scale(${this.scale.value})`;

    this.tagEl.style.transform = `translate3d(${this.tag.get("x") - sx + shift}px, ${this.tag.get("y") - sy}px, 0)`;

    if (this.ringTarget) {
      this.ringEl.style.transform = `translate3d(${this.ring.get("x") - sx}px, ${this.ring.get("y") - sy}px, 0)`;
      this.ringEl.style.width = `${Math.max(0, this.ring.get("w"))}px`;
      this.ringEl.style.height = `${Math.max(0, this.ring.get("h"))}px`;
    }

    if (this.spotTarget) {
      // Full-viewport layer with a rounded hole (even-odd), so only the focus stays sharp.
      const w = innerWidth;
      const h = innerHeight;
      const hole = roundedRect(this.spot.get("x") - sx, this.spot.get("y") - sy, this.spot.get("w"), this.spot.get("h"), 14);
      this.spotEl.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z${hole}")`;
    }
  }

  private ripple(): void {
    if (reduced()) return;
    const el = Object.assign(document.createElement("div"), {
      className: `agent-ripple${this.parked ? " is-waiting" : ""}`,
    });
    el.setAttribute("aria-hidden", "true");
    el.style.transform = `translate3d(${this.pos.get("x") - scrollX}px, ${this.pos.get("y") - scrollY}px, 0)`;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    document.body.append(el);
  }
}

/** Re-trigger a CSS animation that is driven by a class. */
function restartAnimation(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

export const agentCursor = new GhostCursor();
export type { GhostCursor };
