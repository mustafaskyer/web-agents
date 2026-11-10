/**
 * What the Tools tab says about where a tool acts: core's `inspectTools` finds the controls and fields the way the
 * cursor does; this turns them into the panel's serialisable words ("button · Add to cart", "none: runs unseen",
 * "3 matches") and the flags into badges. No DOM references leave this module.
 */
import type { ToolInspection, WebTool } from "@webmcp-agents/core";

/** Where the cursor acts for a tool, in words. */
export interface ControlView {
  /** How it is found: its `target`, a `toolname` marker, its name, or per call (a function `target`). */
  by: ToolInspection["by"];
  /** How many controls match right now. */
  count: number;
  /**
   * The control in words: "button · Add to cart"; "3 matches" (an ordinary tool uses the first, a confirm-gated one
   * fails); "none: runs unseen"; "depends on the call".
   */
  label: string;
  /** The label is a problem: no control for a confirm-gated tool, or several found by name. */
  warn: boolean;
}

/** One parameter and the field its value would be typed into. */
export interface FieldView {
  name: string;
  /** "spinbutton · Quantity", or null when nothing would be typed (`execute` still gets the value). */
  field: string | null;
}

const TAG_ROLES: Record<string, string> = { a: "link", button: "button", summary: "button", select: "combobox", textarea: "textbox" };
const TYPE_ROLES: Record<string, string> = {
  submit: "button",
  reset: "button",
  button: "button",
  image: "button",
  checkbox: "checkbox",
  radio: "radio",
  range: "slider",
  number: "spinbutton",
  search: "searchbox",
};

/** The element's role, for display (core's matcher decides what matches). */
const roleOf = (el: Element): string =>
  el.getAttribute("role") ??
  (el.localName === "input" ? (TYPE_ROLES[(el as HTMLInputElement).type] ?? "textbox") : (TAG_ROLES[el.localName] ?? el.localName));

const clean = (text: string | null | undefined): string => (text ?? "").replace(/\s+/g, " ").trim();

/** The element's name, for display: labelled-by, aria-label, its label, placeholder, text, alt, title. */
function nameOf(el: Element): string {
  const by = clean(
    (el.getAttribute("aria-labelledby") ?? "")
      .split(" ")
      .map((id) => (id ? document.getElementById(id)?.textContent : ""))
      .join(" "),
  );
  const text = el.matches("select,textarea,form") ? "" : clean(el.textContent);
  const name =
    by ||
    clean(el.getAttribute("aria-label")) ||
    clean((el as HTMLInputElement).labels?.[0]?.textContent) ||
    clean(el.getAttribute("placeholder")) ||
    text ||
    clean(el.getAttribute("alt")) ||
    clean(el.getAttribute("title")) ||
    clean(el.getAttribute("name"));
  return name.length > 40 ? `${name.slice(0, 39)}…` : name;
}

/** "button · Add to cart". */
export const describeElement = (el: Element): string => {
  const name = nameOf(el);
  return name ? `${roleOf(el)} · ${name}` : roleOf(el);
};

/** The control line of a tool. */
export function controlView({ by, controls, tool }: Pick<ToolInspection, "by" | "controls" | "tool">): ControlView {
  const gated = !!tool.requireConfirmation;
  if (by === "call") return { by, count: 0, label: "depends on the call", warn: false };
  const [first] = controls;
  if (!first) return { by, count: 0, label: gated ? "none: confirmation fails" : "none: runs unseen", warn: gated };
  if (controls.length === 1) return { by, count: 1, label: describeElement(first), warn: false };
  // Several: the cursor uses the first usable one. A confirm-gated tool found by name (its title, or a locator
  // target) fails closed instead; one found by a selector or a marker accepts a click on any of them.
  const named = by === "name" || (by === "target" && typeof tool.target === "object");
  return { by, count: controls.length, label: `${controls.length} matches`, warn: gated && named };
}

/** The parameters and their fields. */
export const fieldViews = (fields: ToolInspection["fields"]): FieldView[] =>
  fields.map(({ name, field }) => ({ name, field: field ? describeElement(field) : null }));

/** A tool's `match` as written: `/orders`, `/cart, /checkout`, `/^\/orders\/\d+$/`. */
export const matchText = (match: WebTool["match"]): string | undefined =>
  match === undefined ? undefined : match instanceof RegExp ? String(match) : [match].flat().join(", ");

/** The WebMCP hints a tool's flags become, as core maps them (a flag wins over `annotations`). */
export function hintsOf(tool: WebTool): Record<string, unknown> {
  const hints: Record<string, unknown> = { ...tool.annotations };
  if (tool.readOnly !== undefined) hints.readOnlyHint = tool.readOnly;
  if (tool.destructive !== undefined) hints.destructiveHint = tool.destructive;
  if (tool.repeatable !== undefined) hints.idempotentHint = tool.repeatable;
  if (tool.external !== undefined) hints.openWorldHint = tool.external;
  if (tool.safeResponse !== undefined) hints.untrustedContentHint = !tool.safeResponse;
  return hints;
}

/** One flag as a badge. */
export interface FlagView {
  /** The flag's plain name: `readOnly`, `destructive`, `repeatable`, `external`, `safeResponse`. */
  flag: "readOnly" | "destructive" | "repeatable" | "external" | "safeResponse";
  /** The badge: "read-only", "destructive", "repeatable", "external", "untrusted answer". */
  label: string;
  /** What it means, for the badge's tooltip. */
  title: string;
  warn?: boolean;
}

const FLAGS: Array<[hint: string, FlagView]> = [
  ["readOnlyHint", { flag: "readOnly", label: "read-only", title: "readOnly: only reads; safe to call any time" }],
  ["destructiveHint", { flag: "destructive", label: "destructive", title: "destructive: deletes or overwrites; hard to undo", warn: true }],
  ["idempotentHint", { flag: "repeatable", label: "repeatable", title: "repeatable: calling twice has the same effect as once" }],
  ["openWorldHint", { flag: "external", label: "external", title: "external: talks to something outside the page" }],
  [
    "untrustedContentHint",
    { flag: "safeResponse", label: "untrusted answer", title: "safeResponse: false: the answer may contain text the site did not write" },
  ],
];

/** The flags set on a tool (from its WebMCP annotations), in the plan's order. */
export const flagViews = (annotations: Record<string, unknown>): FlagView[] =>
  FLAGS.filter(([hint]) => annotations[hint] === true).map(([, view]) => view);
