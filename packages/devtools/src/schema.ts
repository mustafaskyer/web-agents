/**
 * The slice of JSON Schema the runner understands. WebMCP input schemas are
 * shallow (a form's fields, a WebTool's zod object), so this stays small;
 * anything else falls back to raw JSON in the form.
 */
import type { ModelContextToolInfo } from "@webmcp-agents/core";

/** A JSON Schema node, as tools declare them. Unknown keywords pass through. */
export interface SchemaNode {
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode;
  [keyword: string]: unknown;
}

/** Chrome returns `inputSchema` as a JSON string; the polyfill returns an object. A broken schema reads as empty. */
export function parseSchema(schema: ModelContextToolInfo["inputSchema"]): SchemaNode {
  if (typeof schema !== "string") return (schema as SchemaNode | undefined) ?? {};
  try {
    const parsed: unknown = JSON.parse(schema);
    return parsed && typeof parsed === "object" ? (parsed as SchemaNode) : {};
  } catch {
    return {};
  }
}

/** The single type of a node (`["string", "null"]` reads as "string"), or undefined. */
export function typeOf(schema: SchemaNode): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== "null");
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (Array.isArray(schema.enum)) return "string";
  return undefined;
}
