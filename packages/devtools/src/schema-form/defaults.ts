/**
 * Ready-to-run starting values for a tool's form, so "Run" works on the first
 * click for most tools: a schema `default` wins, then minimums, `true`, the
 * first enum option, or a sample from the description ("e.g. 123").
 */
import { type SchemaNode, typeOf } from "../schema";

/** "Optional promo code, e.g. 123" → "123": a ready-to-run sample for text params. */
export const exampleFrom = (description = ""): string => description.match(/e\.g\.,?\s*["']?([^"',;\s]+)/i)?.[1] ?? "";

/** The starting value for `schema`, recursively for objects. Arrays start empty. */
export function defaultValueFor(schema: SchemaNode): unknown {
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  switch (typeOf(schema)) {
    case "object":
      return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, prop]) => [key, defaultValueFor(prop)]));
    case "array":
      return [];
    case "integer":
    case "number":
      return schema.minimum ?? 1;
    case "boolean":
      return true;
    default:
      return schema.enum?.[0] ?? exampleFrom(schema.description);
  }
}
