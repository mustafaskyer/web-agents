/**
 * A tool call written the way an agent writes it, `open_faq({ topic: "safety" })`, cut into parts so the hero's chips
 * can colour it like code: the tool's name, punctuation, keys and strings.
 */

/** One part of a call: its text, where it starts, and its kind (a CSS class), if it has one. */
export interface CallToken {
  text: string;
  at: number;
  kind?: "tok-fn" | "tok-p" | "tok-key" | "tok-str";
}

const kindOf = (text: string, first: boolean): CallToken["kind"] => {
  if (text.startsWith('"')) return "tok-str";
  if (/^[(){}:,]$/.test(text)) return "tok-p";
  if (first) return "tok-fn";
  return /^\w+$/.test(text) ? "tok-key" : undefined;
};

/** The parts of `code`, in order. */
export function callTokens(code: string): CallToken[] {
  let at = 0;
  return code
    .split(/("[^"]*"|\w+(?=:)|[(){}:,])/)
    .filter(Boolean)
    .map((text) => {
      const token = { text, at, kind: kindOf(text, at === 0) };
      at += text.length;
      return token;
    });
}
