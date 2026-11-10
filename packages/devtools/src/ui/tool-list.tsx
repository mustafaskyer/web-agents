/** Every registered tool, searchable, with what kind it is and a runner per row. */
import { useId, useRef, useState } from "react";
import { defaultValueFor } from "../schema-form/defaults";
import { type DevtoolsStore, isOpen, type ToolView } from "../store";
import { ChevronIcon, LocateIcon, PlayIcon, SpinnerIcon } from "./icons";
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
  return (
    <span className="badges">
      <span className="badge" title={tool.kind === "declarative" ? "A <form toolname> on the page" : "Registered with registerTool"}>
        {tool.kind === "declarative" ? "form" : "imperative"}
      </span>
      {tool.flags.map((flag) => (
        <span key={flag.flag} className={flag.warn ? "badge warn" : "badge"} title={flag.title}>
          {flag.label}
        </span>
      ))}
      {tool.confirms && (
        <span className="badge wait" title="Waits for the user to click its control before it runs">
          confirm
        </span>
      )}
      {!tool.registered && (
        <span
          className="badge warn"
          title={
            tool.fits
              ? "In the catalog, not on right now: not available, or nothing on the page has turned it on"
              : `Not on here: its match (${tool.match}) does not fit this path`
          }
        >
          off here
        </span>
      )}
      {!tool.onScreen && !tool.control && (
        <span className="badge" title="No element with this toolname on the page">
          off screen
        </span>
      )}
    </span>
  );
}

/** What the cursor will do for a tool: its control, the fields it types, where it is on. */
function Resolved({ tool }: { tool: ToolView }) {
  const { control, fields = [], match } = tool;
  if (!control && match === undefined) return null;
  return (
    <dl className="resolved" aria-label={`Where ${tool.name} acts`}>
      {control && (
        <div>
          <dt>Control</dt>
          <dd className={control.warn ? "warn" : undefined} title={TITLES[control.by]}>
            {control.label}
          </dd>
        </div>
      )}
      {fields.length > 0 && (
        <div>
          <dt>Fields</dt>
          <dd>
            {fields.map((f, i) => (
              <span key={f.name} className={f.field ? undefined : "muted"}>
                {i > 0 && ", "}
                <code>{f.name}</code> → {f.field ?? "not typed"}
              </span>
            ))}
          </dd>
        </div>
      )}
      {match !== undefined && (
        <div>
          <dt>Match</dt>
          <dd className={tool.fits ? undefined : "warn"}>
            <code>{match}</code> · {tool.fits ? "fits this path" : "not this path"}
          </dd>
        </div>
      )}
    </dl>
  );
}

const TITLES: Record<NonNullable<ToolView["control"]>["by"], string> = {
  target: "Found by the tool's target",
  marker: 'Found by a toolname="…" marker',
  name: "Found by the tool's title (or its id as words) among buttons, links, tabs, menu items and switches",
  call: "A function target: the control is found from each call's input",
};

/**
 * Run a tool straight from its row: with the arguments it last ran with from the panel, else the schema's defaults.
 * Shows a running state; the result lands in the timeline (and in the runner, if open).
 */
function QuickRun({
  store,
  tool,
  args,
  disabled,
}: {
  store: DevtoolsStore;
  tool: ToolView;
  args(): Record<string, unknown>;
  disabled: boolean;
}) {
  const running = useDevtools(store, (s) => {
    const last = s.calls.find((c) => c.tool === tool.name && c.origin === "devtools");
    return !!last && isOpen(last);
  });
  return (
    <button
      type="button"
      className="btn icon ghost run-quick"
      disabled={disabled || running}
      aria-label={running ? `${tool.name} is running` : `Run ${tool.name}`}
      title={running ? "Running…" : "Run with the last arguments (or the defaults)"}
      aria-busy={running || undefined}
      onClick={() => void store.runTool(tool.name, args())}
    >
      {running ? <SpinnerIcon /> : <PlayIcon />}
    </button>
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
  // Arguments each tool last ran with from the panel, for the rows' quick Run.
  const lastArgs = useRef(new Map<string, Record<string, unknown>>());
  const argsFor = (tool: ToolView) => (): Record<string, unknown> =>
    lastArgs.current.get(tool.name) ?? ((defaultValueFor(tool.schema) ?? {}) as Record<string, unknown>);

  if (!supported) {
    return (
      <div className="empty" role="status">
        <strong>document.modelContext isn't available yet.</strong>
        <code>&lt;WebAgentsProvider&gt;</code> and <code>createWebAgents</code> load the polyfill in a browser without WebMCP, unless{" "}
        <code>polyfill</code> is <code>false</code>.
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
                  <QuickRun store={store} tool={tool} args={argsFor(tool)} disabled={tool === gone || !tool.registered} />
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
                <Resolved tool={tool} />
                {expanded && runner && (
                  <ToolRunner
                    key={runner.key}
                    id={runnerId}
                    store={store}
                    tool={tool}
                    gone={tool === gone || !tool.registered}
                    initial={runner.args ?? lastArgs.current.get(tool.name) ?? defaultValueFor(tool.schema)}
                    onRun={(args) => lastArgs.current.set(tool.name, args)}
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
