import { useMemo, useState } from "react";
import { CopyButton } from "./copy-button";

const MAX_LINES = 30;

/** Pretty-printed JSON with a copy button; long values start collapsed. */
export function JsonView({ value, label }: { value: unknown; label: string }) {
  const [text, lines] = useMemo(() => {
    const json = JSON.stringify(value, null, 2) ?? String(value);
    return [json, json.split("\n")] as const;
  }, [value]);
  const [expanded, setExpanded] = useState(false);
  const long = lines.length > MAX_LINES;
  return (
    <div className="json">
      <pre>{long && !expanded ? `${lines.slice(0, MAX_LINES).join("\n")}\n…` : text}</pre>
      <CopyButton text={() => text} label={`Copy ${label}`} className="copy" />
      {long && (
        <button type="button" className="btn ghost" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}
