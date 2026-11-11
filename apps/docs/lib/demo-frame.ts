/**
 * The demos' frames on the Demos page (<DemoFrame>): how `show_demo` finds a clip's frame (`demoFrame(id)`) and
 * replays it (`showDemo(id)`), and how the page replays the clip its URL names.
 */
import { drawOutline } from "./outline";

/** A demo's frame on this page, if it has one. */
export const demoFrame = (demo: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`.demo-frame[data-demo="${CSS.escape(demo)}"]`);

/**
 * Bring a demo's frame into view, replay its clip from the first frame and outline the frame. False when this page
 * has no frame for `demo`.
 */
export function showDemo(demo: string): boolean {
  const frame = demoFrame(demo);
  if (!frame) return false;
  const box = frame.getBoundingClientRect();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (box.top < 64 || box.bottom > innerHeight) frame.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });

  const video = frame.querySelector("video");
  if (video) {
    video.currentTime = 0;
    void video.play().catch(() => {}); // autoplay may be refused: the poster stays
  }
  // placed in page coordinates, so it lands on the frame whether or not the page is still scrolling there
  drawOutline(frame, { pad: 8, radius: 18 });
  return true;
}
