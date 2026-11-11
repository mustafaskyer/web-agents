/**
 * Draw an outline round an element, in the agent's colour, which then fades: how a tool points at something on the
 * page (`show_demo` at a clip, `show_tools` at the row of tools). The SVG is placed over the page at the element's
 * box and removed when it has faded. Under reduced motion it appears and fades without being drawn.
 */
const SVG = "http://www.w3.org/2000/svg";

export interface OutlineOptions {
  /** Space between the element and the line, in px. */
  pad?: number;
  /** Corner radius of the line, in px. */
  radius?: number;
}

let current: { svg: SVGSVGElement; animation: Animation } | undefined;

export function drawOutline(el: Element, { pad = 8, radius = 18 }: OutlineOptions = {}): void {
  current?.animation.cancel();
  current?.svg.remove();

  const box = el.getBoundingClientRect();
  const w = box.width + pad * 2;
  const h = box.height + pad * 2;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "agent-outline");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  Object.assign(svg.style, {
    left: `${box.left + scrollX - pad}px`,
    top: `${box.top + scrollY - pad}px`,
    width: `${w}px`,
    height: `${h}px`,
  });
  const rect = document.createElementNS(SVG, "rect");
  for (const [name, value] of Object.entries({ x: 1, y: 1, width: w - 2, height: h - 2, rx: radius, pathLength: 1 }))
    rect.setAttribute(name, String(value));
  svg.append(rect);
  document.body.append(svg);

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animation = rect.animate(
    [
      { strokeDashoffset: still ? 0 : 1, opacity: 1, offset: 0 },
      { strokeDashoffset: 0, opacity: 1, offset: 0.55, easing: "ease-out" },
      { strokeDashoffset: 0, opacity: 1, offset: 0.85 },
      { strokeDashoffset: 0, opacity: 0, offset: 1 },
    ],
    { duration: still ? 1800 : 3200, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
  );
  current = { svg, animation };
  const done = (): void => {
    svg.remove();
    if (current?.svg === svg) current = undefined;
  };
  animation.addEventListener("finish", done);
  animation.addEventListener("cancel", done);
}
