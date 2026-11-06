/**
 * <AgentChat>: a launcher and a non-modal chat panel. The agent works the page
 * through its WebMCP tools while the person watches, so the panel never covers
 * it with a backdrop and never steals the cursor's spotlight.
 *
 * The panel lives in a body-level host carrying `data-web-agents-ui`, so typing
 * here never counts as "the user took over" for the agent cursor.
 */
import { UI_HOST_ATTR } from "@web-agents/core";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAgentSession } from "../session/use-agent-session";
import type { AgentAdapter } from "../types";
import { Composer } from "./Composer";
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
  /** Corner for the launcher and panel. Default "bottom-right". */
  position?: "bottom-right" | "bottom-left";
  /** Starter prompts for an empty conversation; default: derived from the page's tools. `false` hides them. */
  suggestions?: string[] | false;
  /** Extra class on the host element (theme with the `--wa-chat-*` properties). */
  className?: string;
  /** sessionStorage key for the conversation; `false` keeps it in memory. Default "web-agents:chat". */
  storageKey?: string | false;
}

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
  suggestions,
  className,
  storageKey,
}: AgentChatProps) {
  const all = useMemo(() => adapters ?? (adapter ? [adapter] : []), [adapter, adapters]);
  if (all.length === 0) throw new Error("<AgentChat> needs an `adapter` (or `adapters`), e.g. createCloudAdapter().");
  const [adapterId, setAdapterId] = useState(all[0]!.id);
  const current = all.find((a) => a.id === adapterId) ?? all[0]!;

  const host = useHost(className, position);
  const session = useAgentSession(current, { storageKey });
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Opening puts the cursor in the composer.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
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
              : "This assistant needs a one-time download before it can answer.";

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
      >
        <header className="wa-chat__header">
          <h2 id={titleId}>{title}</h2>
          {all.length > 1 && (
            <select
              className="wa-chat__switcher"
              aria-label="Assistant"
              value={current.id}
              disabled={session.status === "streaming"}
              onChange={(e) => setAdapterId(e.target.value)}
            >
              {all.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
          {session.messages.length > 0 && (
            <button type="button" className="wa-chat__icon" onClick={session.reset} aria-label="New chat" title="New chat">
              <ResetIcon />
            </button>
          )}
          <button type="button" className="wa-chat__icon" onClick={close} aria-label="Close assistant">
            <CloseIcon />
          </button>
        </header>

        {session.messages.length === 0 ? (
          <div className="wa-chat__empty">
            <p>
              Ask me to do something on this page. You'll see each step happen, and anything that orders, books or deletes waits for your
              click.
            </p>
            {chips.length > 0 && !unavailable && <Suggestions items={chips} onPick={session.send} />}
          </div>
        ) : (
          <MessageList messages={session.messages} thinking={thinking} />
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
