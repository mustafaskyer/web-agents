/**
 * An input's text → the value the schema asks for. Empty means "leave it out",
 * so a missing required field is reported by the tool, not by the form.
 */
import { type SchemaNode, typeOf } from "../schema";

export function coerce(schema: SchemaNode, raw: string): unknown {
  if (raw === "") return undefined;
  const type = typeOf(schema);
  if (type === "integer") {
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? raw : n;
  }
  if (type === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  return raw;
}
