import { type AgentEvent, onAgentEvent } from "@webmcp-agents/core";
import type { WebTool } from "@webmcp-agents/react";
import { useEffect, useRef, useState } from "react";
import { homeTools, openDocs, openGithub } from "../tools";
import { invokeWhenReady } from "./use-tools-ready";

/** The chips' tools: the catalog's, and the header's (which the header registers, in either of its two definitions). */
const tools = { ...homeTools, openDocs, openGithub };

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

/**
 * What a visitor does here, by what they came for. The groups that act on this page come first; Watch is last, since
 * its chips leave for the Demos page.
 */
const GROUPS: readonly { label: string; chips: readonly Chip[] }[] = [
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
    chips: [
      chip(tools.copyStep, { step: 1 }),
      chip(tools.copyInstall),
      chip(tools.toggleTheme),
      chip(tools.openGithub),
      chip(tools.openGithubIssue, { title: "Feedback" }),
    ],
  },
  { label: "Watch", chips: [chip(tools.showDemo, { demo: "field-store" }), chip(tools.showDemo, { demo: "skyline" })] },
];
const CHIPS: readonly Chip[] = GROUPS.flatMap((group) => group.chips);

/** The chip that makes this call, if one does: same tool, same arguments. */
const chipFor = (tool: string, args: unknown): Chip | undefined =>
  CHIPS.find((c) => c.tool.id === tool && JSON.stringify(c.args) === JSON.stringify(args ?? {}));

/** The chips' tools, and show_tools (the intro, which points at the row). */
const ours = (tool: string): boolean => tool === tools.showTools.id || CHIPS.some((c) => c.tool.id === tool);

/** The call the status line is about. `code` is the call as written: a chip's, or another agent's own arguments. */
export type TryItRun = { tool: string; code: string } & (
  | { state: "running"; yielded?: boolean }
  | { state: "parked"; prompt: string }
  | { state: "done"; text: string; yielded?: boolean }
  | { state: "error"; text: string }
);

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

/** A call some other agent made (the devtools, Chrome), written like a chip's. A form tool's arguments are not known up front. */
function codeOf(tool: string, args: unknown): string {
  if (args === undefined) return `${tool}(…)`;
  const json = args && typeof args === "object" && Object.keys(args).length ? JSON.stringify(args) : "";
  return `${tool}(${json.length > 60 ? `${json.slice(0, 59)}…` : json})`;
}

/** What <TryIt> renders and does. */
export interface TryIt {
  /** The chips, by group; a chip is its call as written (`code`). */
  groups: readonly { label: string; chips: readonly { code: string }[] }[];
  /** The call the status line is about, or null for the explainer. */
  run: TryItRun | null;
  /** True when the parked call is a chip's, so the person can cancel it from here. */
  cancellable: boolean;
  /** Make the call a chip shows (by its `code`). Ignored while that tool is already running or waiting. */
  call: (code: string) => void;
  /** Cancel the chip's call to `tool`. */
  cancel: (tool: string) => void;
}

/**
 * The hero's chips: each one a call to one of the page's tools, made with `tool.invoke`, the path every agent takes.
 * The status comes from `onAgentEvent`, never from the click, so a call from the devtools or from Chrome lights the
 * same chip.
 */
export function useTryIt(): TryIt {
  const [run, setRun] = useState<TryItRun | null>(null);
  const calls = useRef(new Map<string, AbortController>());
  /** The code of the chip whose call is running, per tool. */
  const mine = useRef(new Map<string, string>());

  // ---------- 1. state from the agent events, whoever made the call ----------
  useEffect(
    () =>
      onAgentEvent((e: AgentEvent) => {
        if (e.type === "yield") {
          setRun((now) => (now?.state === "running" ? { ...now, yielded: true } : now));
          return;
        }
        if (e.type === "resume" || !ours(e.tool)) return;
        const { tool } = e;
        /** The code of the run this event continues: the chip's own call when a chip made it. */
        const code = (now: TryItRun | null): string => mine.current.get(tool) ?? (now?.tool === tool ? now.code : `${tool}(…)`);
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
      }),
    [],
  );

  // ---------- 2. a finished call makes room for the explainer again ----------
  useEffect(() => {
    if (run?.state !== "done" && run?.state !== "error") return;
    const timer = setTimeout(() => setRun((now) => (now === run ? null : now)), REST_MS);
    return () => clearTimeout(timer);
  }, [run]);

  // ---------- 3. a chip makes the call ----------
  const call = (code: string): void => {
    const c = CHIPS.find((one) => one.code === code);
    if (!c) return;
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

  return {
    groups: GROUPS,
    run,
    cancellable: run?.state === "parked" && calls.current.has(run.tool),
    call,
    cancel,
  };
}
