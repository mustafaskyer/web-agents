import type { ToolDescriptor } from "../types";

const GENERAL = "What can you do on this page?";
const MAX = 48;

/** Up to three prompts from the page's tools (their description's first sentence), plus a general one. */
export function suggestionsFor(tools: readonly ToolDescriptor[]): string[] {
  const picks: string[] = [];
  for (const t of tools) {
    const sentence = t.description
      .split(/(?<=[.!?])\s/)[0]
      ?.replace(/[.!?]$/, "")
      .trim();
    if (sentence && sentence.length <= MAX && !picks.includes(sentence)) picks.push(sentence);
    if (picks.length === 3) break;
  }
  return [...picks, GENERAL];
}

export function Suggestions({ items, onPick }: { items: string[]; onPick(text: string): void }) {
  return (
    <ul className="wa-chat__suggestions" aria-label="Suggestions">
      {items.map((s) => (
        <li key={s}>
          <button type="button" onClick={() => onPick(s)}>
            {s}
          </button>
        </li>
      ))}
    </ul>
  );
}
