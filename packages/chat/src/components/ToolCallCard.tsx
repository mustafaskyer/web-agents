import { outputText } from "../adapter/wire";
import type { AgentPart } from "../types";

type ToolPart = Extract<AgentPart, { type: "tool" }>;

const STATUS: Record<ToolPart["state"], { label: string; data: string }> = {
  running: { label: "Working", data: "running" },
  "awaiting-confirmation": { label: "Waiting for you", data: "awaiting" },
  done: { label: "Done", data: "done" },
  error: { label: "Failed", data: "error" },
  cancelled: { label: "Cancelled", data: "cancelled" },
};

/** `add_to_cart` → "Add to cart". */
export const toolLabel = (name: string): string => {
  const words = name.replace(/[_.-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** `qty: 2, variant: M` — the call's arguments in one short line. */
function summarize(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const text = Object.entries(input as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
}

/** Bring the tool's element (or the button the browser paused on) into view. */
function showOnPage(name: string): void {
  const el =
    document.querySelector(`[toolname="${CSS.escape(name)}"] [data-tool-submit-active]`) ??
    document.querySelector(`[toolname="${CSS.escape(name)}"]`);
  el?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

export function ToolCallCard({ part }: { part: ToolPart }) {
  const status = STATUS[part.state];
  const args = summarize(part.input);
  const result = part.state === "done" ? outputText(part.output) : part.state === "error" ? part.error || outputText(part.output) : "";
  return (
    <div className="wa-chat__tool" data-status={status.data}>
      <div className="wa-chat__tool-head">
        <span className="wa-chat__tool-name">{toolLabel(part.name)}</span>
        <span className="wa-chat__chip">{status.label}</span>
      </div>
      {args && <p className="wa-chat__tool-args">{args}</p>}
      {part.state === "awaiting-confirmation" && (
        <div className="wa-chat__confirm">
          <p>{part.prompt ?? "Confirm on the page to continue."}</p>
          <button type="button" className="wa-chat__link" onClick={() => showOnPage(part.name)}>
            Show me
          </button>
        </div>
      )}
      {result && (
        <p className="wa-chat__tool-result" data-clamp={result.length > 140 || undefined}>
          {result.replace(/^Error(?: \[[a-z_]+\])?:\s*/, "")}
        </p>
      )}
    </div>
  );
}
