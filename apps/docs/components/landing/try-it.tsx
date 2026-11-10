"use client";

/**
 * "Try it as an agent would": the hero's centerpiece, chips in three groups (watch, read, do), each one a call to one
 * of this page's WebMCP tools, written the way an agent makes it. Clicking a chip calls the tool with `tool.invoke`,
 * the path every agent takes, so the cursor flies to the real control and uses it. The chips never know how a run went
 * from the click: their state comes from `onAgentEvent`, so a call from the devtools or from Chrome lights the same
 * chip. The section itself is what `show_tools` points at.
 */
import { type AgentEvent, onAgentEvent, UI_HOST_ATTR } from "@webmcp-agents/core";
import type { WebTool } from "@webmcp-agents/react";
import { useEffect, useRef, useState } from "react";
import { invokeWhenReady } from "./agent-layer";
import { homeTools as tools } from "./site-tools";
import { TOOLS_ROW_CLASS } from "./tools-row";

interface Chip {
  tool: WebTool;
  args: Record<string, unknown>;
  /** The call as an agent writes it; also the chip's identity (two chips may call one tool). */
  code: string;
}

/** A chip's call, written from its tool and arguments. */
const chip = (tool: WebTool, args: Record<string, unknown> = {}): Chip => {
  const parts = Object.entries(args).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return { tool, args, code: `${tool.id}(${parts.length ? `{ ${parts.join(", ")} }` : ""})` };
};

/** What a visitor does here, by what they came for. The first group leads to the Demos page. */
const GROUPS: readonly { label: string; chips: readonly Chip[] }[] = [
  { label: "Watch", chips: [chip(tools.showDemo, { demo: "field-store" }), chip(tools.showDemo, { demo: "skyline" })] },
  {
    label: "Read",
    chips: [
      chip(tools.searchDocs, { query: "confirm" }),
      chip(tools.openFaq, { topic: "safety" }),
      chip(tools.openDocs, { page: "agent-cursor" }),
    ],
  },
  {
    label: "Do",
    chips: [chip(tools.copyStep, { step: 1 }), chip(tools.copyInstall), chip(tools.toggleTheme), chip(tools.openGithub)],
  },
];
const CHIPS: readonly Chip[] = GROUPS.flatMap((group) => group.chips);

/** The chip that makes this call, if one does: same tool, same arguments. */
const chipFor = (tool: string, args: unknown): Chip | undefined =>
  CHIPS.find((c) => c.tool.id === tool && JSON.stringify(c.args) === JSON.stringify(args ?? {}));

/** The call the status line is about. `code` is the call as written: a chip's, or another agent's own arguments. */
type Run = { tool: string; code: string } & (
  | { state: "running"; yielded?: boolean }
  | { state: "parked"; prompt: string }
  | { state: "done"; text: string; yielded?: boolean }
  | { state: "error"; text: string }
);

const EXPLAINER = "Every chip is a WebMCP tool call. Click one and watch the agent use this page.";
/** How long a finished call stays in the status line before the explainer returns. */
const REST_MS = 9000;

/** The first sentence of a tool's answer, whatever shape the browser handed back: the status line has one row. */
function firstLine(result: unknown): string {
  const text =
    typeof result === "string"
      ? result
      : ((result as { content?: { text?: string }[] } | null)?.content?.map((part) => part.text ?? "").join(" ") ?? "");
  const line = (text.split("\n")[0] ?? "").split(/(?<=\.)\s/)[0]?.trim() ?? "";
  return line.length > 150 ? `${line.slice(0, 149)}…` : line;
}

/** A chip's call with its parts marked up, so it reads as code: name, punctuation, keys, strings. */
function Call({ code }: { code: string }) {
  let at = 0;
  const parts = code
    .split(/("[^"]*"|\w+(?=:)|[(){}:,])/)
    .filter(Boolean)
    .map((text) => {
      const part = { text, at };
      at += text.length;
      return part;
    });
  const kindOf = (text: string, first: boolean): string | undefined => {
    if (text.startsWith('"')) return "tok-str";
    if (/^[(){}:,]$/.test(text)) return "tok-p";
    if (first) return "tok-fn";
    return /^\w+$/.test(text) ? "tok-key" : undefined;
  };
  return (
    <code>
      {parts.map(({ text, at: offset }) => (
        <span key={offset} className={kindOf(text, offset === 0)}>
          {text}
        </span>
      ))}
    </code>
  );
}

/** A call some other agent made (the devtools, Chrome), written like a chip's. A form tool's arguments are not known up front. */
function codeOf(tool: string, args: unknown): string {
  if (args === undefined) return `${tool}(…)`;
  const json = args && typeof args === "object" && Object.keys(args).length ? JSON.stringify(args) : "";
  return `${tool}(${json.length > 60 ? `${json.slice(0, 59)}…` : json})`;
}

export const TryIt = () => {
  const [run, setRun] = useState<Run | null>(null);
  const calls = useRef(new Map<string, AbortController>());
  /** The code of the chip whose call is running, per tool. */
  const mine = useRef(new Map<string, string>());

  // ---------- 1. state from the agent events, whoever made the call ----------
  useEffect(() => {
    // the chips' tools, and show_tools (the intro, which points at this row)
    const ours = (tool: string): boolean => tool === tools.showTools.id || CHIPS.some((c) => c.tool.id === tool);
    return onAgentEvent((e: AgentEvent) => {
      if (e.type === "yield") {
        setRun((now) => (now?.state === "running" ? { ...now, yielded: true } : now));
        return;
      }
      if (e.type === "resume" || !ours(e.tool)) return;
      const { tool } = e;
      /** The code of the run this event continues: the chip's own call when a chip made it. */
      const code = (now: Run | null): string => mine.current.get(tool) ?? (now?.tool === tool ? now.code : `${tool}(…)`);
      if (e.type === "start")
        setRun(() => ({ state: "running", tool, code: mine.current.get(tool) ?? chipFor(tool, e.args)?.code ?? codeOf(tool, e.args) }));
      else if (e.type === "park") setRun((now) => ({ state: "parked", tool, code: code(now), prompt: e.prompt }));
      else if (e.type === "result")
        // a run the person interrupted still answers: say why the cursor left
        setRun((now) => ({
          state: "done",
          tool,
          code: code(now),
          text: firstLine(e.result),
          yielded: now?.state === "running" && now.yielded,
        }));
      else if (e.type === "error") setRun((now) => ({ state: "error", tool, code: code(now), text: e.error }));
      else if (e.type === "cancel") setRun((now) => (now?.tool === tool ? null : now));
    });
  }, []);

  // ---------- 2. a finished call makes room for the explainer again ----------
  useEffect(() => {
    if (run?.state !== "done" && run?.state !== "error") return;
    const timer = setTimeout(() => setRun((now) => (now === run ? null : now)), REST_MS);
    return () => clearTimeout(timer);
  }, [run]);

  // ---------- 3. a chip makes the call ----------
  const call = (c: Chip): void => {
    const tool = c.tool.id;
    if (calls.current.has(tool)) return; // that tool is already running or waiting for the person
    const controller = new AbortController();
    calls.current.set(tool, controller);
    mine.current.set(tool, c.code);
    setRun({ state: "running", tool, code: c.code });
    invokeWhenReady(c.tool, c.args, controller.signal)
      .catch((err: unknown) => {
        // A cancelled call is the person's choice, not an error.
        if ((err as { name?: string } | null)?.name === "AbortError") setRun((now) => (now?.code === c.code ? null : now));
        else setRun({ state: "error", tool, code: c.code, text: err instanceof Error ? err.message : String(err) });
      })
      .finally(() => {
        calls.current.delete(tool);
        mine.current.delete(tool);
      });
  };
  const cancel = (tool: string): void => calls.current.get(tool)?.abort();

  return (
    // Clicks in here are the person driving the agent, like a chat: they must not make the cursor yield.
    <section className={TOOLS_ROW_CLASS} aria-label="Try it as an agent would" {...{ [UI_HOST_ATTR]: "" }}>
      <p className="try-it__status" aria-live="polite" data-state={run?.state ?? "idle"}>
        {!run && EXPLAINER}
        {run?.state === "running" && (
          <>
            <code>{run.code}</code>{" "}
            {run.yielded ? "is finishing without the cursor: you moved, so it stepped aside." : "is running. Watch the cursor."}
          </>
        )}
        {run?.state === "parked" && (
          <>
            <code>{run.code}</code> is waiting for you. {run.prompt}.{" "}
            {calls.current.has(run.tool) && (
              <button type="button" className="try-it__cancel" onClick={() => cancel(run.tool)}>
                Cancel
              </button>
            )}
          </>
        )}
        {run?.state === "done" && (
          <>
            <code>{run.code}</code> answered: {run.text}
            {run.yielded && " (You moved, so the cursor stepped aside.)"}
          </>
        )}
        {run?.state === "error" && (
          <>
            <code>{run.code}</code> failed: {run.text}
          </>
        )}
      </p>
      <div className="try-it__groups">
        {GROUPS.map((group) => (
          <div key={group.label} className="try-it__group">
            <span className="try-it__label" id={`try-it-${group.label.toLowerCase()}`}>
              {group.label}
            </span>
            <ul className="try-it__chips" aria-labelledby={`try-it-${group.label.toLowerCase()}`}>
              {group.chips.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className="try-it__chip"
                    data-state={run?.code === c.code ? run.state : "idle"}
                    title={`Run ${c.code}`}
                    onClick={() => call(c)}
                  >
                    <span className="try-it__dot" aria-hidden="true" />
                    <Call code={c.code} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
