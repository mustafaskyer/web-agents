/** Every registered tool, searchable, with what kind it is and a runner per row. */
import { useId, useRef, useState } from "react";
import { defaultValueFor } from "../schema-form/defaults";
import type { DevtoolsStore, ToolView } from "../store";
import { ChevronIcon, LocateIcon } from "./icons";
import { ToolRunner } from "./tool-runner";
import { useDevtools } from "./use-devtools";

/** Which tool's runner is open, and with what arguments (`key` changes to reset it). */
export interface RunnerTarget {
  tool: string;
  args?: unknown;
  key: number;
}

/** Props of `ToolList`. */
export interface ToolListProps {
  store: DevtoolsStore;
  runner: RunnerTarget | null;
  onRunner(target: RunnerTarget | null): void;
}

function Badges({ tool }: { tool: ToolView }) {
  const a = tool.annotations;
  return (
    <span className="badges">
      <span className="badge" title={tool.kind === "declarative" ? "A <form toolname> on the page" : "Registered with registerTool"}>
        {tool.kind === "declarative" ? "form" : "imperative"}
      </span>
      {a.readOnlyHint === true && <span className="badge">read-only</span>}
      {a.destructiveHint === true && <span className="badge warn">destructive</span>}
      {tool.confirms && (
        <span className="badge wait" title="Waits for the user to click its submit button">
          confirm
        </span>
      )}
      {!tool.onScreen && (
        <span className="badge" title="No element with this toolname on the page">
          off screen
        </span>
      )}
    </span>
  );
}

/** The Tools tab. */
export function ToolList({ store, runner, onRunner }: ToolListProps) {
  const tools = useDevtools(store, (s) => s.tools);
  const supported = useDevtools(store, (s) => s.supported);
  const [query, setQuery] = useState("");
  const baseId = useId();
  // The open tool, remembered so its runner can say it was unregistered rather than vanish.
  const lastOpen = useRef<ToolView | null>(null);

  if (!supported) {
    return (
      <div className="empty" role="status">
        <strong>document.modelContext isn't available.</strong>
        Import <code>@web-agents/polyfill/auto</code> in development, or use a Chrome build with WebMCP.
      </div>
    );
  }

  const open = runner ? tools.find((t) => t.name === runner.tool) : undefined;
  if (open) lastOpen.current = open;
  const gone = runner && !open && lastOpen.current?.name === runner.tool ? lastOpen.current : null;
  const q = query.trim().toLowerCase();
  const rows = [...(gone ? [gone] : []), ...tools].filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t === gone,
  );

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search tools"
          aria-label="Search tools"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <span className="muted" aria-live="polite">
          {q ? `${rows.length} of ${tools.length}` : `${tools.length} ${tools.length === 1 ? "tool" : "tools"}`}
        </span>
      </div>
      {tools.length === 0 && !gone ? (
        <div className="empty">
          <strong>No tools on this page yet.</strong>
          Add <code>toolname</code> to a form or register one with <code>useWebTool</code>.
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">No tools match “{query.trim()}”.</div>
      ) : (
        <ul aria-label="Tools">
          {rows.map((tool) => {
            const expanded = runner?.tool === tool.name;
            const runnerId = `${baseId}-${tool.name}`;
            return (
              <li key={tool.name} className="tool">
                <div className="tool-head">
                  <button
                    type="button"
                    className="disclosure"
                    aria-expanded={expanded}
                    aria-controls={expanded ? runnerId : undefined}
                    onClick={() => onRunner(expanded ? null : { tool: tool.name, key: Date.now() })}
                  >
                    <ChevronIcon />
                    <code>{tool.name}</code>
                    <span className="desc" title={tool.description}>
                      {tool.title ? `${tool.title} · ` : ""}
                      {tool.description}
                    </span>
                  </button>
                  <Badges tool={tool} />
                  <button
                    type="button"
                    className="btn icon ghost"
                    disabled={!tool.onScreen || tool === gone}
                    aria-label={`Locate ${tool.name} on the page`}
                    title={tool.onScreen ? "Locate on the page" : "Not on screen"}
                    onClick={() => store.locate(tool.name)}
                  >
                    <LocateIcon />
                  </button>
                </div>
                {expanded && runner && (
                  <ToolRunner
                    key={runner.key}
                    id={runnerId}
                    store={store}
                    tool={tool}
                    gone={tool === gone}
                    initial={runner.args ?? defaultValueFor(tool.schema)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
