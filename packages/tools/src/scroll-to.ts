/**
 * `scroll_to`: bring a heading, or a piece of text, into view and highlight it for a moment, so the agent can show
 * the user where something is ("where's the refund policy?"). Headings win over body text; an exact heading over
 * one that only starts with or contains the words. The answer quotes the start of that section, so the agent can
 * also read it.
 */
import { defineWebTool, UI_HOST_ATTR, type WebTool, WebToolError } from "@webmcp-agents/core";
import { type CommonToolOptions, clean, reducedMotion, usable } from "./shared";

/** Options for `scrollTo`. */
export interface ScrollToOptions extends CommonToolOptions {
  /** How long the highlight stays, in ms. Default 2500. */
  highlightMs?: number;
}

/** What `scroll_to` takes. */
export interface ScrollToInput {
  /** A heading, or words that appear on the page. */
  text: string;
}

const DESCRIPTION =
  'Scroll the page to a heading or a piece of text and highlight it, and answer the start of that section. Use when the user asks where something is on this page or to show them a part of it ("show me the pricing", "where are the shipping details"). Needs nothing first; get_page lists the headings. Next: answer the user from the quoted text, or act on that section with its tools.';

const HIGHLIGHT = "web-agents-scroll-to";
const MARK = "data-web-agents-scroll-to";
const HEADINGS = "h1,h2,h3,h4,h5,h6,[role=heading]";
const SKIP = `script,style,noscript,template,[${UI_HOST_ATTR}]`;

const levelOf = (el: Element): number => Number(el.getAttribute("aria-level") ?? el.localName.slice(1)) || 2;

/** Where `text` is on the page: the element, and the range of the words themselves when they are in body text. */
function find(text: string): { el: Element; range?: Range; heading: boolean } | undefined {
  const want = clean(text).toLowerCase();
  if (!want) return undefined;
  const headings = [...document.querySelectorAll(HEADINGS)].filter((h) => !h.closest(SKIP) && usable(h));
  const said = (h: Element) => clean(h.textContent).toLowerCase();
  const heading =
    headings.find((h) => said(h) === want) ??
    headings.find((h) => said(h).startsWith(want)) ??
    headings.find((h) => said(h).includes(want));
  if (heading) return { el: heading, heading: true };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    const at = (node.nodeValue ?? "").toLowerCase().indexOf(want);
    if (at === -1 || !usable(parent)) continue;
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + want.length);
    return { el: parent, range, heading: false };
  }
  return undefined;
}

/** The start of what is under a heading (up to the next heading of its level or above), or of a matched block. */
function excerpt(el: Element, heading: boolean, max = 300): string {
  let text = "";
  if (heading) {
    const level = levelOf(el);
    for (let next = el.nextElementSibling; next && text.length < max; next = next.nextElementSibling) {
      if (next.matches(HEADINGS) && levelOf(next) <= level) break;
      text += ` ${clean(next.textContent)}`;
    }
  } else text = clean((el.closest("p,li,td,dd,blockquote,section,article") ?? el).textContent);
  text = clean(text);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

let styled = false;
let clearLast: (() => void) | undefined;

/** Highlight the words (CSS Custom Highlight API) or, where it is missing, outline the element; undone after `ms`. */
function highlight(el: Element, range: Range | undefined, ms: number): void {
  clearLast?.();
  if (!styled) {
    styled = true;
    const style = document.createElement("style");
    style.textContent = `::highlight(${HIGHLIGHT}) { background-color: Mark; color: MarkText; }
[${MARK}] { outline: 2px solid Highlight; outline-offset: 4px; border-radius: 2px; }`;
    document.head.append(style);
  }
  const registry = (globalThis.CSS as { highlights?: Map<string, unknown> } | undefined)?.highlights;
  const Ctor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  let undo: () => void;
  if (registry && Ctor) {
    const words = range ?? document.createRange();
    if (!range) words.selectNodeContents(el);
    registry.set(HIGHLIGHT, new Ctor(words));
    undo = () => registry.delete(HIGHLIGHT);
  } else {
    el.setAttribute(MARK, "");
    undo = () => el.removeAttribute(MARK);
  }
  const timer = setTimeout(() => clearLast?.(), ms);
  clearLast = () => {
    clearTimeout(timer);
    undo();
    clearLast = undefined;
  };
}

/** The `scroll_to` tool: scroll to a heading or text and highlight it. */
export function scrollTo({
  id = "scroll_to",
  description = DESCRIPTION,
  highlightMs = 2500,
}: ScrollToOptions = {}): WebTool<ScrollToInput, string> {
  return defineWebTool<ScrollToInput, string>({
    id,
    title: "Scroll to",
    description,
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            'A heading of this page (get_page lists them) or words on it, as the user said them, e.g. "Shipping" or "30-day returns".',
        },
      },
      required: ["text"],
    },
    repeatable: true,
    // the cursor goes to what it scrolls to
    target: (input) => {
      const text = (input as Partial<ScrollToInput> | undefined)?.text;
      return typeof text === "string" ? find(text)?.el : undefined;
    },
    execute: ({ text }) => {
      const found = typeof text === "string" ? find(text) : undefined;
      if (!found) {
        const headings = [...document.querySelectorAll(HEADINGS)]
          .filter((h) => !h.closest(SKIP) && usable(h))
          .map((h) => clean(h.textContent))
          .filter(Boolean)
          .slice(0, 20);
        throw new WebToolError(
          "invalid_input",
          `Nothing on this page says "${text}".${headings.length ? ` Its headings: ${headings.join(" | ")}.` : ""}`,
        );
      }
      const { el, range, heading } = found;
      el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
      highlight(el, range, highlightMs);
      const what = heading ? `the heading "${clean(el.textContent)}"` : `"${clean(range?.toString())}"`;
      const quote = excerpt(el, heading);
      return `Scrolled to ${what} and highlighted it.${quote ? ` It reads: ${quote}` : ""}`;
    },
  });
}
