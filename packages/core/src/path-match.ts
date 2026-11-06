/**
 * Route patterns for route-scoped tools: literal segments, `:param` (exactly
 * one segment) and a trailing `*` (the rest, possibly empty). Trailing slashes
 * don't matter; case does. `"*"` alone matches every path.
 *
 * Not URLPattern: it isn't in every browser the polyfill targets, and this is
 * all the routes map needs.
 */

const compiled = new Map<string, RegExp>();

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const trimSlash = (path: string): string => (path.length > 1 ? path.replace(/\/+$/, "") : path) || "/";

function compile(pattern: string): RegExp {
  const segments = trimSlash(pattern).split("/").slice(1);
  let source = "";
  for (const [i, segment] of segments.entries()) {
    if (segment === "*" && i === segments.length - 1) {
      source += "(?:/.*)?";
    } else if (segment.startsWith(":")) {
      source += "/[^/]+";
    } else if (segment !== "") {
      source += `/${escapeRegExp(segment)}`;
    }
  }
  return new RegExp(`^${source || "/"}$`);
}

/** True if `pathname` matches `pattern` (see the module comment for the syntax). */
export function matchPath(pattern: string, pathname: string): boolean {
  if (pattern === "*") return true;
  let re = compiled.get(pattern);
  if (!re) {
    re = compile(pattern);
    compiled.set(pattern, re);
  }
  return re.test(trimSlash(pathname));
}
