/** What every factory takes, and small helpers the tools share. Nothing here touches the DOM at import. */
import { UI_HOST_ATTR } from "@webmcp-agents/core";

/** Options every common tool takes: its name and wording, when the defaults don't fit your site. */
export interface CommonToolOptions {
  /** The tool's name (`[a-zA-Z0-9_.-]`, 1–128). Default: the tool's own (`get_time`, `go_to`, …). */
  id?: string;
  /**
   * What the agent reads to decide when to call it. Default: a description that says what it answers, when to use it
   * and what comes next. Replace it to name your site's own tools in the "next" part.
   */
  description?: string;
}

/** Trimmed, with runs of whitespace collapsed. */
export const clean = (text: string | null | undefined): string => (text ?? "").replace(/\s+/g, " ").trim();

/**
 * True when a person could see and reach `el`: rendered, visible, and not inside an `inert` or `aria-hidden` part of
 * the page or inside library UI (the devtools, the chat). The same rule core's locator applies.
 */
export const usable = (el: Element): boolean =>
  !el.closest(`[inert],[aria-hidden=true],[${UI_HOST_ATTR}]`) &&
  (el.checkVisibility?.({ visibilityProperty: true }) ?? !!el.getClientRects()[0]);

/** The user asked for reduced motion. */
export const reducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
