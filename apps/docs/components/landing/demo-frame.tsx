/**
 * A browser-window frame on a padded "well", for a clip of one of the example apps. The clip plays by itself
 * (muted, looping); the frame says which app and which page it shows. On the Demos page `show_demo` acts on a frame
 * (`demoFrame(id)` in lib/demo-frame.ts), which finds it by `data-demo`.
 */
import type { ReactNode } from "react";

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
