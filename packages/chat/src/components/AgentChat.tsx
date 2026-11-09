/**
 * <AgentChat>: a launcher and a non-modal chat panel. The agent works the page
 * through its WebMCP tools while the person watches, so by default the panel
 * docks beside the page (which makes room for it) rather than covering it, and
 * the person can drag it wider or narrower. `layout="floating"` keeps the
 * corner pop-over instead.
 *
 * The panel lives in a body-level host carrying `data-web-agents-ui`, so typing
 * here never counts as "the user took over" for the agent cursor.
 */
import { UI_HOST_ATTR } from "@webmcp-agents/core";
import { type CSSProperties, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useAgentSession } from "../session/use-agent-session";
import type { AgentAdapter } from "../types";
import { AdapterSwitcher } from "./AdapterSwitcher";
import { Composer } from "./Composer";
import { ResizeHandle, useDock } from "./dock";
import { DownloadCard } from "./DownloadCard";
import { ChatIcon, CloseIcon, ResetIcon } from "./icons";
import { MessageList } from "./MessageList";
import { Suggestions, suggestionsFor } from "./Suggestions";

/** Props of `<AgentChat>`. */
export interface AgentChatProps {
  /** The agent. Pass this or `adapters`. */
  adapter?: AgentAdapter;
  /** Several agents: the panel shows a switcher (cloud, in-browser…). The first is the default. */
  adapters?: readonly AgentAdapter[];
  /** Panel title. Default "Assistant". */
  title?: string;
  /** Open on first render. Default false. */
  defaultOpen?: boolean;
  /** Side (and corner) for the launcher and panel. Default "bottom-right". */
  position?: "bottom-right" | "bottom-left";
  /**
   * "docked" (default): beside the page, full height, resizable; the page makes room. "floating": a pop-over in the
   * corner. Narrow screens get a bottom sheet either way.
   */
  layout?: "docked" | "floating";
  /** Starter prompts for an empty conversation; default: derived from the page's tools. `false` hides them. */
  suggestions?: string[] | false;
  /** Extra class on the host element (theme with the `--wa-chat-*` properties). */
  className?: string;
  /** sessionStorage key for the conversation; `false` keeps it in memory. Default "web-agents:chat". */
  storageKey?: string | false;
}

const ADAPTER_KEY = "web-agents:chat:adapter";

function useHost(className: string | undefined, position: string): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute(UI_HOST_ATTR, "chat");
    document.body.append(el);
    setHost(el);
    return () => el.remove();
  }, []);
  useEffect(() => {
    if (!host) return;
    host.className = ["wa-chat", className].filter(Boolean).join(" ");
    host.dataset.position = position;
  }, [host, className, position]);
  return host;
}

/** The chat launcher and panel. Render it inside `<WebAgentsProvider>` so the agent sees the tools the page has on. */
export function AgentChat({
  adapter,
  adapters,
  title = "Assistant",
  defaultOpen = false,
  position = "bottom-right",
  layout = "docked",
  suggestions,
  className,
  storageKey,
}: AgentChatProps) {
  const all = useMemo(() => adapters ?? (adapter ? [adapter] : []), [adapter, adapters]);
  if (all.length === 0) throw new Error("<AgentChat> needs an `adapter` (or `adapters`), e.g. createCloudAdapter().");
  // the person's last choice, when that adapter is still offered
  const [adapterId, setAdapterId] = useState(() => {
    const saved = typeof localStorage === "undefined" ? null : localStorage.getItem(ADAPTER_KEY);
    return all.some((a) => a.id === saved) ? saved! : all[0]!.id;
  });
  const current = all.find((a) => a.id === adapterId) ?? all[0]!;
  const choose = (id: string): void => {
    setAdapterId(id);
    localStorage.setItem(ADAPTER_KEY, id);
  };

  const host = useHost(className, position);
  const side = position === "bottom-left" ? "left" : "right";
  const session = useAgentSession(current, { storageKey });
  const [open, setOpen] = useState(defaultOpen);
  const dock = useDock(open && layout === "docked", side);
  useEffect(() => {
    if (host) host.dataset.layout = layout;
  }, [host, layout]);
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Opening puts the cursor in the composer.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    // commit first: the launcher is hidden while the panel is open, and a hidden button can't take focus
    flushSync(() => setOpen(false));
    launcherRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  }

  const status = session.adapterStatus;
  const unavailable =
    status.state === "ready"
      ? null
      : status.state === "unavailable"
        ? status.reason
        : status.state === "error"
          ? status.error
          : status.state === "loading"
            ? "Connecting to the assistant…"
            : status.state === "downloading"
              ? `Downloading the model… ${Math.round(status.progress * 100)}%`
              : "Download the model to start.";

  // ---------- model download (opt-in, cancellable) ----------
  const download = useRef<AbortController | null>(null);
  const size = useRef<number | undefined>(undefined);
  if (status.state === "needs-download") size.current = status.bytes;
  const startDownload = (): void => {
    download.current?.abort();
    const ctrl = new AbortController();
    download.current = ctrl;
    current.prepare?.(ctrl.signal).catch(() => {}); // failures show as the adapter's "error" status
  };
  const other = all.find((a) => a.id !== current.id);
  const downloadCard =
    current.prepare && (status.state === "needs-download" || status.state === "downloading" || status.state === "error") ? (
      <DownloadCard
        status={status}
        bytes={size.current}
        onDownload={startDownload}
        onCancel={() => download.current?.abort()}
        onUseOther={other ? () => choose(other.id) : undefined}
        otherLabel={other?.label}
      />
    ) : null;

  const last = session.messages.at(-1);
  const busyTool = last?.parts.some((p) => p.type === "tool" && (p.state === "running" || p.state === "awaiting-confirmation"));
  const thinking = session.status === "streaming" && !busyTool && !(last?.role === "assistant" && last.parts.at(-1)?.type === "text");
  const chips = suggestions === false ? [] : (suggestions ?? suggestionsFor(session.tools));

  if (!host) return null;
  return createPortal(
    <>
      <div
        id={panelId}
        className="wa-chat__panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        data-state={open ? "open" : "closed"}
        hidden={!open}
        onKeyDown={onKeyDown}
        style={layout === "docked" ? ({ "--wa-chat-width": `${dock.width}px` } as CSSProperties) : undefined}
      >
        {dock.active && <ResizeHandle side={side} width={dock.width} onResize={dock.setWidth} />}
        <header className="wa-chat__header">
          <h2 id={titleId}>{title}</h2>
          {session.messages.length > 0 && (
            <button type="button" className="wa-chat__icon" onClick={session.reset} aria-label="New chat" title="New chat">
              <ResetIcon />
            </button>
          )}
          <button type="button" className="wa-chat__icon" onClick={close} aria-label="Close assistant">
            <CloseIcon />
          </button>
        </header>
        {all.length > 1 && (
          <AdapterSwitcher adapters={all} value={current.id} disabled={session.status === "streaming"} onChange={choose} />
        )}

        {session.messages.length === 0 ? (
          <div className="wa-chat__empty">
            <p>
              Ask me to do something on this page. You'll see each step happen, and anything that orders, books or deletes waits for your
              click.
            </p>
            {chips.length > 0 && !unavailable && <Suggestions items={chips} onPick={session.send} />}
            {downloadCard}
          </div>
        ) : (
          <>
            <MessageList messages={session.messages} thinking={thinking} />
            {downloadCard}
          </>
        )}

        {session.status === "error" && session.error && (
          <div className="wa-chat__error" role="alert">
            <p>{session.error.message}</p>
            {session.error.code !== "chat_disabled" && (
              <button type="button" className="wa-chat__link" onClick={session.retry}>
                Try again
              </button>
            )}
          </div>
        )}

        <Composer
          inputRef={inputRef}
          streaming={session.status === "streaming"}
          unavailable={unavailable}
          onSend={session.send}
          onStop={session.stop}
        />
      </div>

      <button
        ref={launcherRef}
        type="button"
        className="wa-chat__launcher"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Close ${title.toLowerCase()}` : `Open ${title.toLowerCase()}`}
        onClick={() => (open ? close() : setOpen(true))}
        data-busy={session.status === "streaming" || undefined}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>,
    host,
  );
}
