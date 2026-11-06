/**
 * Small models pick tools better from a short list with short schemas. These
 * helpers rank the page's tools against the request, compact their schemas,
 * and check a call's arguments before it touches the page.
 */
import type { JSONSchema } from "@web-agents/core";
import type { ToolDescriptor } from "@web-agents/chat";
import type { CompactTool } from "./types";

const KEEP = new Set(["type", "properties", "required", "enum", "minimum", "maximum", "items", "description"]);
/**
 * A tool's description is how a model learns when to call it, what it needs first and what comes next: keep all of
 * it (a sane cap only). Parameter descriptions are kept shorter.
 */
const MAX_DESCRIPTION = 400;
const MAX_PARAM_DESCRIPTION = 160;

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const short = (s: string): string => clip(s, MAX_DESCRIPTION);

/** Only what a small model needs: type, properties, required, enum, bounds, items, short descriptions. */
export function compactSchema(schema: JSONSchema): JSONSchema {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (!KEEP.has(key)) continue;
    if (key === "description" && typeof value === "string") out.description = clip(value, MAX_PARAM_DESCRIPTION);
    else if (key === "properties" && value && typeof value === "object") {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compactSchema(v as JSONSchema)]));
    } else if (key === "items" && value && typeof value === "object") out.items = compactSchema(value as JSONSchema);
    else out[key] = value;
  }
  return out as JSONSchema;
}

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

/**
 * At most `max` tools, most relevant to `query` first (word overlap with the name and description; tools used
 * recently get a bonus). With `max` or fewer tools, all of them, in their original order.
 */
export function rankTools(
  tools: readonly ToolDescriptor[],
  query: string,
  { max = 8, recent = [] as readonly string[] } = {},
): CompactTool[] {
  const compact = (t: ToolDescriptor): CompactTool => ({
    name: t.name,
    description: short(t.description),
    parameters: compactSchema(t.inputSchema),
  });
  if (tools.length <= max) return tools.map(compact);
  const q = new Set(words(query));
  const score = (t: ToolDescriptor): number => {
    const name = words(t.name.replace(/_/g, " "));
    const desc = words(t.description);
    let s = 0;
    for (const w of name) if (q.has(w) || [...q].some((x) => x.length > 3 && w.startsWith(x.slice(0, 4)))) s += 3;
    for (const w of desc) if (q.has(w)) s += 1;
    if (recent.includes(t.name)) s += 2;
    return s;
  };
  return tools
    .map((t, i) => ({ t, i, s: score(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, max)
    .map(({ t }) => compact(t));
}

const typeOf = (v: unknown): string => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

/**
 * The first problem with `args` against `schema` (type, required, enum, integer, min/max), or null. The same small
 * subset the devtools form uses: enough to catch a small model's usual mistakes, no validator dependency.
 */
export function validateArgs(schema: JSONSchema, args: unknown): string | null {
  const s = schema as { properties?: Record<string, JSONSchema>; required?: string[] };
  if (typeOf(args) !== "object") return "Arguments must be a JSON object.";
  const obj = args as Record<string, unknown>;
  for (const key of s.required ?? []) if (obj[key] === undefined || obj[key] === "") return `Missing required argument "${key}".`;
  for (const [key, value] of Object.entries(obj)) {
    const prop = s.properties?.[key] as { type?: string | string[]; enum?: unknown[]; minimum?: number; maximum?: number } | undefined;
    if (!prop) continue; // extra arguments are ignored by the page
    const types = prop.type === undefined ? [] : Array.isArray(prop.type) ? prop.type : [prop.type];
    const actual = typeOf(value);
    const ok =
      types.length === 0 ||
      types.some((t) => t === actual || (t === "integer" && Number.isInteger(value)) || (t === "number" && actual === "number"));
    if (!ok) return `"${key}" must be ${types.join(" or ")}, got ${JSON.stringify(value)}.`;
    if (prop.enum && !prop.enum.includes(value)) return `"${key}" must be one of ${prop.enum.map((e) => JSON.stringify(e)).join(", ")}.`;
    if (typeof value === "number") {
      if (prop.minimum !== undefined && value < prop.minimum) return `"${key}" must be at least ${prop.minimum}.`;
      if (prop.maximum !== undefined && value > prop.maximum) return `"${key}" must be at most ${prop.maximum}.`;
    }
  }
  return null;
}
