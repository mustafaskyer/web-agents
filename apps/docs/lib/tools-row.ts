/**
 * The row of tools to try under the home page's title (<TryIt>): what `show_tools` points at and outlines, and what
 * the first-visit introduction checks is in view. Its own module, so the tool, the intro and the component share one
 * selector without importing each other.
 */
export const TOOLS_ROW_CLASS = "try-it";

/** The row on this page, if it has one. */
export const toolsRow = (): HTMLElement | null => document.querySelector<HTMLElement>(`.${TOOLS_ROW_CLASS}`);
