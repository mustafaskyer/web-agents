"use client";

/**
 * "Experiment with the tools below": the hero's centerpiece, a title over chips in three groups (read, do, watch), each one a call to one
 * of this page's WebMCP tools, written the way an agent makes it. Clicking a chip calls the tool the way every agent
 * does, so the cursor flies to the real control and uses it; the status line follows every call to these tools,
 * whoever made it (webmcp-agents/hooks/use-try-it.ts). The section itself is what `show_tools` points at.
 */
import { UI_HOST_ATTR } from "@webmcp-agents/core";
import { callTokens } from "@/lib/call-code";
import { TOOLS_ROW_CLASS } from "@/lib/tools-row";
import { useTryIt } from "@/webmcp-agents/hooks/use-try-it";

const EXPLAINER = "Every chip is a WebMCP tool call. Click one and watch the agent use this page.";

const Tokens = ({ tokens }: { tokens: ReturnType<typeof callTokens> }) =>
  tokens.map(({ text, at, kind }) => (
    <span key={at} className={kind}>
      {text}
    </span>
  ));

/**
 * A chip's call with its parts marked up, so it reads as code: name, punctuation, keys, strings. The name with its "("
 * and the arguments are two unbreakable pieces: a call too long for its chip breaks between them, never inside.
 */
function Call({ code }: { code: string }) {
  const tokens = callTokens(code);
  const open = tokens.findIndex((t) => t.text === "(") + 1;
  return (
    <code className="try-it__call">
      <span className="try-it__call-part">
        <Tokens tokens={tokens.slice(0, open)} />
      </span>
      <wbr />
      <span className="try-it__call-part">
        <Tokens tokens={tokens.slice(open)} />
      </span>
    </code>
  );
}

export const TryIt = () => {
  const { groups, run, cancellable, call, cancel } = useTryIt();

  return (
    // Clicks in here are the person driving the agent, like a chat: they must not make the cursor yield.
    <section className={TOOLS_ROW_CLASS} aria-labelledby="try-it-title" {...{ [UI_HOST_ATTR]: "" }}>
      <header className="try-it__head">
        <span className="try-it__eyebrow">
          <span className="try-it__dot" aria-hidden="true" />
          Live on this page
        </span>
        <h2 id="try-it-title" className="try-it__title">
          Experiment with the tools below
        </h2>
      </header>
      <p className="try-it__status" aria-live="polite" data-state={run?.state ?? "idle"}>
        {!run && EXPLAINER}
        {run?.state === "running" && (
          <>
            <code>{run.code}</code>{" "}
            {run.yielded ? "is finishing without the cursor: you took over, so it stepped aside." : "is running. Watch the cursor."}
          </>
        )}
        {run?.state === "parked" && (
          <>
            <code>{run.code}</code> is waiting for you. {run.prompt}.{" "}
            {cancellable && (
              <button type="button" className="try-it__cancel" onClick={() => cancel(run.tool)}>
                Cancel
              </button>
            )}
          </>
        )}
        {run?.state === "done" && (
          <>
            <code>{run.code}</code> answered: {run.text}
            {run.yielded && " (You took over, so the cursor stepped aside.)"}
          </>
        )}
        {run?.state === "error" && (
          <>
            <code>{run.code}</code> failed: {run.text}
          </>
        )}
      </p>
      <div className="try-it__groups">
        {groups.map((group) => (
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
                    onClick={() => call(c.code)}
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
