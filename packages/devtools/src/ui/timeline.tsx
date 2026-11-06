/**
 * Every call, newest first: from the panel or from a real agent, with fills,
 * the waiting-for-you state, results and durations. Rows where the user took
 * over from the cursor sit between them.
 */
import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
import { type CallRecord, type DevtoolsStore, isOpen, type TimelineMarker } from "../store";
import { CallDetail } from "./call-detail";
import { StatusIcon } from "./icons";
import { formatDuration, statusText } from "./labels";
import { useDevtools } from "./use-devtools";

/** Props of `Timeline`. */
export interface TimelineProps {
  store: DevtoolsStore;
  onRerun(call: CallRecord): void;
}

const TICK_MS = 250;
const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const clock = (at: number) => CLOCK.format(at);

/** Re-render every tick while something is running, so live durations grow. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const MARKER_TEXT = { yield: "You took over", resume: "Cursor back" } as const;

type Row = { kind: "call"; at: number; call: CallRecord } | { kind: "marker"; at: number; marker: TimelineMarker };

/** Two newest-first lists → one, newest first. */
function mergeRows(calls: readonly CallRecord[], markers: readonly TimelineMarker[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  while (i < calls.length || j < markers.length) {
    const call = calls[i];
    const marker = markers[j];
    if (call && (!marker || call.startedAt >= marker.at)) {
      rows.push({ kind: "call", at: call.startedAt, call });
      i++;
    } else if (marker) {
      rows.push({ kind: "marker", at: marker.at, marker });
      j++;
    }
  }
  return rows;
}

interface CallRowProps {
  call: CallRecord;
  /** Duration in ms, so finished rows keep equal props while the clock ticks. */
  ms: number;
  longest: number;
  expanded: boolean;
  mayConfirm: boolean;
  detailId: string;
  store: DevtoolsStore;
  onToggle(id: string): void;
  onRerun(call: CallRecord): void;
}

const CallRow = memo(function CallRow({ call, ms, longest, expanded, mayConfirm, detailId, store, onToggle, onRerun }: CallRowProps) {
  return (
    <li className="row" data-status={call.status}>
      <button
        type="button"
        className="call-head"
        aria-expanded={expanded}
        aria-controls={expanded ? detailId : undefined}
        onClick={() => onToggle(call.id)}
      >
        <span className="status-icon">
          <StatusIcon status={call.status} />
        </span>
        <code>{call.tool}</code>
        <span className="badge">{call.origin}</span>
        <span className="status">{statusText(call, mayConfirm)}</span>
        <span className="duration" title={`Took ${formatDuration(ms)}`}>
          <span className="track">
            <span className="fill" style={{ transform: `scaleX(${ms / longest})` }} />
          </span>
          <span className="ms">{formatDuration(ms)}</span>
        </span>
        <time className="time" dateTime={new Date(call.startedAt).toISOString()}>
          {clock(call.startedAt)}
        </time>
      </button>
      {expanded && <CallDetail id={detailId} call={call} store={store} onRerun={onRerun} />}
    </li>
  );
});

/** The Timeline tab. */
export function Timeline({ store, onRerun }: TimelineProps) {
  const calls = useDevtools(store, (s) => s.calls);
  const markers = useDevtools(store, (s) => s.markers);
  const tools = useDevtools(store, (s) => s.tools);
  const hasVisuals = useDevtools(store, (s) => s.hasVisuals);
  const confirming = useMemo(() => new Set(tools.filter((t) => t.confirms).map((t) => t.name)), [tools]);
  const rows = useMemo(() => mergeRows(calls, markers), [calls, markers]);
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();
  const now = useNow(calls.some(isOpen));
  const onToggle = useCallback((id: string) => setOpen((current) => (current === id ? null : id)), []);

  if (calls.length === 0 && markers.length === 0) {
    return (
      <div className="empty">
        <strong>No calls yet.</strong>
        Run a tool from the Tools tab, or let an agent call one.
        {!hasVisuals && " Calls from an agent show up only while the agent cursor (installAgentVisuals) is installed."}
      </div>
    );
  }

  const duration = (c: CallRecord) => Math.max(0, (c.endedAt ?? now) - c.startedAt);
  const longest = Math.max(1, ...calls.map(duration));

  return (
    <>
      <div className="toolbar">
        <span className="muted grow">
          {calls.length} {calls.length === 1 ? "call" : "calls"}
        </span>
        <button type="button" className="btn" onClick={() => store.clearCalls()}>
          Clear
        </button>
      </div>
      <ol aria-label="Tool calls, newest first">
        {rows.map((row) =>
          row.kind === "marker" ? (
            <li key={row.marker.id} className="marker">
              {MARKER_TEXT[row.marker.type]}
              {row.marker.reason ? ` (${row.marker.reason})` : ""} · {clock(row.marker.at)}
            </li>
          ) : (
            <CallRow
              key={row.call.id}
              call={row.call}
              ms={duration(row.call)}
              longest={longest}
              expanded={open === row.call.id}
              mayConfirm={!hasVisuals && confirming.has(row.call.tool)}
              detailId={`${baseId}-${row.call.id}`}
              store={store}
              onToggle={onToggle}
              onRerun={onRerun}
            />
          ),
        )}
      </ol>
    </>
  );
}
