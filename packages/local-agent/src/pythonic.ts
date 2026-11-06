/**
 * Pythonic tool calls, the format Liquid's LFM2 models are trained on:
 *
 *   <|tool_call_start|>[open_product(slug="trail-cap"), add_to_cart(qty=2)]<|tool_call_end|>
 *
 * A small recursive-descent reader for that call list (keyword arguments; string, number, boolean, None, list and
 * dict values), and the writer that puts earlier calls back into the history in the same shape.
 */

/** One call as written: its name and keyword arguments. */
export interface PythonicCall {
  name: string;
  arguments: Record<string, unknown>;
}

const LITERALS: Record<string, unknown> = { True: true, False: false, None: null, true: true, false: false, null: null };

/** The calls in `text` (`[a(x=1), b()]` or `a(x=1)`), or null when it isn't a call list. Never throws. */
export function parsePythonicCalls(text: string): PythonicCall[] | null {
  let i = 0;
  const src = text.trim();
  const fail = (): never => {
    throw new SyntaxError(`Unexpected input at ${i}`);
  };
  const space = (): void => {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  };
  const eat = (c: string): boolean => {
    space();
    if (src[i] !== c) return false;
    i++;
    return true;
  };
  const ident = (): string => {
    space();
    const m = /^[A-Za-z_][\w.-]*/.exec(src.slice(i));
    if (!m) fail();
    i += m![0].length;
    return m![0];
  };
  const string = (): string => {
    const quote = src[i]!;
    let out = "";
    for (i++; i < src.length && src[i] !== quote; i++) {
      if (src[i] === "\\" && i + 1 < src.length) {
        const next = src[++i]!;
        out += next === "n" ? "\n" : next === "t" ? "\t" : next;
      } else out += src[i];
    }
    if (src[i] !== quote) fail();
    i++;
    return out;
  };
  const value = (): unknown => {
    space();
    const c = src[i];
    if (c === '"' || c === "'") return string();
    if (c === "[") {
      i++;
      const list: unknown[] = [];
      while (!eat("]")) {
        list.push(value());
        if (!eat(",") && (space(), src[i] !== "]")) fail();
      }
      return list;
    }
    if (c === "{") {
      i++;
      const obj: Record<string, unknown> = {};
      while (!eat("}")) {
        space();
        const key = src[i] === '"' || src[i] === "'" ? string() : ident();
        if (!eat(":")) fail();
        obj[key] = value();
        if (!eat(",") && (space(), src[i] !== "}")) fail();
      }
      return obj;
    }
    const num = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/.exec(src.slice(i));
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    const word = ident();
    if (word in LITERALS) return LITERALS[word];
    return fail();
  };
  const call = (): PythonicCall => {
    const name = ident();
    if (!eat("(")) fail();
    const args: Record<string, unknown> = {};
    while (!eat(")")) {
      const key = ident();
      if (!eat("=")) fail();
      args[key] = value();
      if (!eat(",") && (space(), src[i] !== ")")) fail();
    }
    return { name, arguments: args };
  };

  try {
    const calls: PythonicCall[] = [];
    const bracketed = eat("[");
    while (true) {
      calls.push(call());
      if (!eat(",")) break;
    }
    if (bracketed) eat("]"); // a missing "]" is a small model's slip, not a different meaning
    space();
    return i >= src.length && calls.length ? calls : null;
  } catch {
    return null;
  }
}

/** A call as the model writes it, for its own history: `open_product(slug="trail-cap")`. */
export function toPythonic(name: string, args: Record<string, unknown> = {}): string {
  const literal = (v: unknown): string =>
    v === true ? "True" : v === false ? "False" : v === null || v === undefined ? "None" : JSON.stringify(v);
  return `${name}(${Object.entries(args)
    .map(([k, v]) => `${k}=${literal(v)}`)
    .join(", ")})`;
}
