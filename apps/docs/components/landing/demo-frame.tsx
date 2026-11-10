/**
 * A browser-window frame on a padded "well", for a clip of one of the example apps. The clip plays by itself
 * (muted, looping); the frame says which app and which page it shows. On the Demos page `show_demo` acts on a frame
 * (`demoFrame(id)`): `showDemo(id)` replays that clip and draws an outline round it.
 */
import type { ReactNode } from "react";
import { drawOutline } from "./outline";

export interface DemoFrameProps {
  /** The demo's id, so `show_demo` can find this frame. */
  demo: string;
  /** What the address bar shows, e.g. "localhost:5175 · Skyline". */
  address: string;
  /** WebM and MP4 sources, in that order. */
  sources: readonly { src: string; type: string }[];
  /** The still shown before the clip plays. */
  poster?: string;
  /** Said once for assistive tech, since the clip has no narration. */
  description: string;
  /** Anything under the frame (a caption). */
  children?: ReactNode;
}

export const DemoFrame = ({ demo, address, sources, poster, description, children }: DemoFrameProps) => (
  <figure className="demo-well">
    <div className="demo-frame" data-demo={demo}>
      <div className="demo-frame__bar">
        <span className="demo-frame__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="demo-frame__address">{address}</span>
      </div>
      {/* preload="metadata": two clips on one page, each starts loading when it scrolls near (autoplay) */}
      <video autoPlay loop muted playsInline preload="metadata" poster={poster} aria-label={description} className="demo-frame__video">
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>
    </div>
    {children && <figcaption className="demo-well__caption">{children}</figcaption>}
  </figure>
);

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
