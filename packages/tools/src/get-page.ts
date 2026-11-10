/**
 * `get_page`: where the user is on the site, read from the page itself: its title, path, query parameters, hash and
 * language, the text the user selected, and its headings (the outline an agent can `scroll_to`).
 */
import { defineWebTool, UI_HOST_ATTR, type WebTool } from "@webmcp-agents/core";
import { type CommonToolOptions, clean, usable } from "./shared";

/** Options for `getPage`. */
export interface GetPageOptions extends CommonToolOptions {
  /** At most this many headings in the answer, in page order. Default 40. */
  maxHeadings?: number;
}

/** One heading of the page. */
export interface PageHeading {
  /** 1–6. */
  level: number;
  text: string;
  /** Its `id`, when it has one (the `#hash` that links to it). */
  id?: string;
}

/** What `get_page` reads (`structuredContent`, and what `invoke` resolves to there). */
export interface PageInfo {
  title: string;
  url: string;
  path: string;
  /** The URL's query parameters; a repeated one is a list: `?tag=a&tag=b` → `{ tag: ["a", "b"] }`. */
  query: Record<string, string | string[]>;
  /** The hash without `#`, or "". */
  hash: string;
  /** The page's language (`<html lang>`), else the browser's. */
  language: string;
  /** The text the user selected on the page, or "" (capped at 2000 characters). */
  selection: string;
  /** The visible headings, in page order. */
  headings: PageHeading[];
}

/** What the tool answers: a summary for the agent, `structuredContent` for code. */
export interface PageAnswer {
  content: [{ type: "text"; text: string }];
  structuredContent: PageInfo;
}

const DESCRIPTION =
  'Answer where the user is on this site: the page\'s title, path, query parameters (filters, search terms, ids in the URL), hash, language, the text the user selected, and the page\'s headings. Use when the user says "this page", "this", "the selected text" or "what I\'m looking at", or before acting on what the URL says. Needs nothing first. Next: the tool that acts on it; scroll_to with a heading to show a section.';

const MAX_SELECTION = 2000;

/** The URL's query as an object; repeated keys become lists. */
export function queryOf(search: string): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    const had = query[key];
    query[key] = had === undefined ? value : [...[had].flat(), value];
  }
  return query;
}

/** The user's selection, unless it is inside library UI (the chat, the devtools): text there is not the page's. */
function selectedText(): string {
  const selection = getSelection();
  const anchor = selection?.anchorNode;
  const el = anchor instanceof Element ? anchor : anchor?.parentElement;
  if (!selection || el?.closest(`[${UI_HOST_ATTR}]`)) return "";
  const text = clean(selection.toString());
  return text.length > MAX_SELECTION ? `${text.slice(0, MAX_SELECTION)}…` : text;
}

/** The `get_page` tool: title, path, query, hash, language, selection and headings. Read-only. */
export function getPage({
  id = "get_page",
  description = DESCRIPTION,
  maxHeadings = 40,
}: GetPageOptions = {}): WebTool<Record<string, never>, PageAnswer> {
  return defineWebTool<Record<string, never>, PageAnswer>({
    id,
    title: "Read this page",
    description,
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    execute: () => {
      const headings: PageHeading[] = [];
      for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")) {
        if (headings.length >= maxHeadings) break;
        const text = clean(el.textContent);
        if (!text || !usable(el)) continue;
        const level = Number(el.getAttribute("aria-level") ?? el.localName.slice(1)) || 2;
        headings.push({ level, text, ...(el.id && { id: el.id }) });
      }
      const info: PageInfo = {
        title: document.title,
        url: location.href,
        path: location.pathname,
        query: queryOf(location.search),
        hash: location.hash.slice(1),
        language: document.documentElement.lang || navigator.language,
        selection: selectedText(),
        headings,
      };
      const params = Object.entries(info.query).map(([k, v]) => `${k}=${[v].flat().join(", ")}`);
      const text = [
        `Title: ${info.title || "(none)"}`,
        `Path: ${info.path}`,
        `Query parameters: ${params.length ? params.join("; ") : "none"}`,
        info.hash && `Hash: #${info.hash}`,
        `Language: ${info.language}`,
        `Selected text: ${info.selection ? JSON.stringify(info.selection) : "none"}`,
        `Headings: ${headings.length ? headings.map((h) => `${"#".repeat(h.level)} ${h.text}`).join(" | ") : "none"}`,
      ]
        .filter(Boolean)
        .join("\n");
      return { content: [{ type: "text", text }], structuredContent: info };
    },
  });
}
