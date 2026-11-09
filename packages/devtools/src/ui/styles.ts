/**
 * The panel's CSS, adopted by its shadow root: page styles can't reach in
 * (the playground's global `button` rules, say) and ours can't leak out. A
 * string, not a .css file, so the package needs no bundler CSS support.
 *
 * Dense dev-tool type: 12 px system sans for chrome, monospace for names,
 * args and JSON. Neutral greys; status colours only where they carry meaning.
 */
export const css = `
:host {
  all: initial;
  color-scheme: light dark;
  --wa-bg: #ffffff;
  --wa-bg-subtle: #f4f4f5;
  --wa-bg-hover: #ececef;
  --wa-fg: #18181b;
  --wa-muted: #63636b;
  --wa-border: #e4e4e7;
  --wa-accent: var(--agent, #18181b);
  --wa-on-accent: var(--agent-ink, #ffffff);
  --wa-ok: #15803d;
  --wa-error: #b91c1c;
  --wa-wait: #a16207;
  --wa-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  --wa-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --wa-z: calc(var(--agent-z, 2147483000) + 100);
  font: 12px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--wa-fg);
}
@media (prefers-color-scheme: dark) {
  :host {
    --wa-bg: #18181b;
    --wa-bg-subtle: #212124;
    --wa-bg-hover: #2c2c30;
    --wa-fg: #f4f4f5;
    --wa-muted: #a1a1aa;
    --wa-border: #34343a;
    --wa-accent: #f4f4f5;
    --wa-on-accent: #18181b;
    --wa-ok: #4ade80;
    --wa-error: #f87171;
    --wa-wait: #facc15;
    --wa-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
}
*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; color: inherit; }
code, pre, .mono { font-family: var(--wa-mono); font-size: 11.5px; }
:focus-visible { outline: 2px solid var(--wa-accent); outline-offset: 1px; }
[hidden] { display: none !important; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- buttons ---------- */
.btn {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
  border: 1px solid var(--wa-border); border-radius: 6px; background: var(--wa-bg); cursor: pointer; white-space: nowrap;
}
.btn:hover:not(:disabled) { background: var(--wa-bg-hover); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn.primary { background: var(--wa-accent); border-color: var(--wa-accent); color: var(--wa-on-accent); font-weight: 600; }
.btn.primary:hover:not(:disabled) { background: var(--wa-accent); opacity: 0.88; }
.btn.ghost { border-color: transparent; background: transparent; }
.btn.ghost:hover:not(:disabled) { background: var(--wa-bg-hover); }
.btn.icon { width: 26px; padding: 0; justify-content: center; }
.run-quick { color: var(--wa-accent, currentColor); }
.run-quick:disabled[aria-busy] { opacity: 1; cursor: progress; }
.spinner { animation: wa-spin 0.8s linear infinite; }
@keyframes wa-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
.btn svg { width: 14px; height: 14px; flex: none; }
.kbd { color: var(--wa-muted); font-size: 11px; font-weight: 400; }
.btn.primary .kbd { color: inherit; opacity: 0.7; }

/* ---------- launcher ---------- */
.launcher {
  position: fixed; right: calc(16px + var(--wa-chat-inset-right, 0px)); bottom: 16px; z-index: var(--wa-z);
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--wa-border);
  display: grid; place-items: center; background: var(--wa-bg); box-shadow: var(--wa-shadow); cursor: pointer;
  transition: transform 0.15s ease-out;
}
.launcher:hover { transform: scale(1.06); }
.launcher:active { transform: scale(0.96); }
.launcher svg { width: 18px; height: 18px; }
.launcher .dot {
  position: absolute; top: 4px; right: 4px; width: 9px; height: 9px; border-radius: 50%;
  background: var(--wa-accent); border: 2px solid var(--wa-bg);
}

/* ---------- panel ---------- */
.panel {
  position: fixed; z-index: var(--wa-z); display: flex; flex-direction: column;
  background: var(--wa-bg); border: 0 solid var(--wa-border); box-shadow: var(--wa-shadow);
  animation: wa-in 0.16s ease-out;
}
/* clear of a docked assistant (@webmcp-agents/chat), which publishes its width on <html> */
.panel[data-dock="bottom"] { left: var(--wa-chat-inset-left, 0); right: var(--wa-chat-inset-right, 0); bottom: 0; border-top-width: 1px; }
.panel[data-dock="right"] { top: 0; right: var(--wa-chat-inset-right, 0); bottom: 0; border-left-width: 1px; }
.panel[data-embedded] { position: static; height: 100%; box-shadow: none; animation: none; border: 0; }
@keyframes wa-in { from { opacity: 0; transform: translateY(8px); } }
.resize { position: absolute; z-index: 1; touch-action: none; }
.panel[data-dock="bottom"] .resize { left: 0; right: 0; top: -3px; height: 6px; cursor: ns-resize; }
.panel[data-dock="right"] .resize { top: 0; bottom: 0; left: -3px; width: 6px; cursor: ew-resize; }
.resize:hover, .resize:focus-visible { background: var(--wa-accent); opacity: 0.4; outline: none; }

.bar {
  display: flex; align-items: center; gap: 12px; height: 36px; padding: 0 6px 0 12px; flex: none;
  border-bottom: 1px solid var(--wa-border); background: var(--wa-bg-subtle);
}
.brand { font-weight: 600; display: flex; align-items: center; gap: 6px; }
.brand svg { width: 14px; height: 14px; }
.tabs { display: flex; height: 100%; }
.tab {
  position: relative; display: flex; align-items: center; gap: 6px; padding: 0 10px; border: 0; background: none;
  color: var(--wa-muted); cursor: pointer;
}
.tab:hover { color: var(--wa-fg); }
.tab[aria-selected="true"] { color: var(--wa-fg); font-weight: 600; }
.tab[aria-selected="true"]::after { content: ""; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; background: var(--wa-fg); }
.count {
  min-width: 18px; height: 16px; padding: 0 5px; border-radius: 8px; display: inline-grid; place-items: center;
  background: var(--wa-bg-hover); font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums;
}
.count.live { background: var(--wa-accent); color: var(--wa-on-accent); }
.bar .actions { margin-left: auto; display: flex; gap: 2px; }
.body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }

/* ---------- shared bits ---------- */
.toolbar {
  position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: var(--wa-bg); border-bottom: 1px solid var(--wa-border);
}
.grow { flex: 1; }
.search {
  flex: 1; max-width: 360px; height: 26px; padding: 0 8px; border: 1px solid var(--wa-border); border-radius: 6px;
  background: var(--wa-bg);
}
.muted { color: var(--wa-muted); }
.empty { padding: 24px 16px; color: var(--wa-muted); max-width: 520px; }
.empty strong { display: block; color: var(--wa-fg); margin-bottom: 4px; }
.badge {
  display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 4px; flex: none;
  border: 1px solid var(--wa-border); color: var(--wa-muted); font-size: 10.5px; white-space: nowrap;
}
.badge.warn { color: var(--wa-error); border-color: color-mix(in srgb, var(--wa-error) 40%, transparent); }
.badge.wait { color: var(--wa-wait); border-color: color-mix(in srgb, var(--wa-wait) 45%, transparent); }
ul, ol { list-style: none; margin: 0; padding: 0; }

/* ---------- tools ---------- */
.tool { border-bottom: 1px solid var(--wa-border); }
.tool-head { display: flex; align-items: center; gap: 8px; padding: 4px 8px 4px 4px; }
.disclosure {
  flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 10px; padding: 5px 6px; border: 0; border-radius: 6px;
  background: none; text-align: left; cursor: pointer;
}
.disclosure:hover { background: var(--wa-bg-hover); }
.chevron { flex: none; width: 10px; color: var(--wa-muted); transition: transform 0.12s ease-out; align-self: center; }
.disclosure[aria-expanded="true"] .chevron { transform: rotate(90deg); }
.disclosure code { font-weight: 600; flex: none; }
.desc { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--wa-muted); }
.badges { display: flex; gap: 4px; }

/* ---------- runner ---------- */
.runner { padding: 4px 16px 14px 30px; display: grid; gap: 10px; }
.runner-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.segmented { display: inline-flex; gap: 0; margin: 0; border: 1px solid var(--wa-border); border-radius: 6px; padding: 1px; }
.segmented button { border: 0; background: none; height: 22px; padding: 0 8px; border-radius: 4px; cursor: pointer; color: var(--wa-muted); }
.segmented button[aria-pressed="true"] { background: var(--wa-bg-hover); color: var(--wa-fg); font-weight: 600; }
.notice { padding: 8px 10px; border-radius: 6px; background: var(--wa-bg-subtle); color: var(--wa-muted); }
.status-line { display: flex; align-items: center; gap: 6px; font-weight: 600; }

/* ---------- schema form ---------- */
.form { display: grid; gap: 10px; max-width: 520px; }
.field { display: grid; gap: 3px; }
.field > label, .legend { font-weight: 600; display: flex; gap: 4px; align-items: baseline; }
.field .type { font-weight: 400; color: var(--wa-muted); font-family: var(--wa-mono); font-size: 10.5px; }
.req { color: var(--wa-error); }
.input {
  width: 100%; height: 28px; padding: 0 8px; border: 1px solid var(--wa-border); border-radius: 6px; background: var(--wa-bg);
}
textarea.input { height: auto; min-height: 64px; padding: 6px 8px; resize: vertical; font-family: var(--wa-mono); font-size: 11.5px; }
.input[aria-invalid="true"] { border-color: var(--wa-error); }
.check { display: flex; align-items: center; gap: 6px; font-weight: 600; }
.hint { color: var(--wa-muted); margin: 0; }
.error-text { color: var(--wa-error); margin: 0; }
fieldset { margin: 0; padding: 8px 10px 10px; border: 1px solid var(--wa-border); border-radius: 8px; display: grid; gap: 10px; }
legend { padding: 0 4px; font-weight: 600; }
.items { display: grid; gap: 6px; }
.item { display: flex; gap: 6px; align-items: flex-start; }
.item > :first-child { flex: 1; }

/* ---------- timeline ---------- */
.row { border-bottom: 1px solid var(--wa-border); content-visibility: auto; contain-intrinsic-size: auto 34px; }
.call-head {
  width: 100%; display: grid; grid-template-columns: 16px minmax(0, 1.4fr) auto minmax(0, 1fr) 120px auto; align-items: center; gap: 10px;
  padding: 7px 12px; border: 0; background: none; text-align: left; cursor: pointer;
}
.call-head:hover { background: var(--wa-bg-hover); }
.call-head code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.status { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-status="ok"] .status, [data-status="ok"] .status-icon { color: var(--wa-ok); }
[data-status="error"] .status, [data-status="error"] .status-icon { color: var(--wa-error); }
[data-status="waiting"] .status, [data-status="waiting"] .status-icon { color: var(--wa-wait); }
[data-status="cancelled"] .status, [data-status="cancelled"] .status-icon { color: var(--wa-muted); }
.status-icon { width: 14px; height: 14px; display: grid; place-items: center; }
.status-icon svg { width: 14px; height: 14px; }
.spin { animation: wa-spin 0.9s linear infinite; }
@keyframes wa-spin { to { transform: rotate(360deg); } }
.duration { display: flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
.track { display: block; flex: 1; height: 4px; border-radius: 2px; background: var(--wa-bg-hover); overflow: hidden; }
.fill { display: block; height: 100%; border-radius: 2px; background: currentColor; transform-origin: left; }
.ms { width: 52px; text-align: right; color: var(--wa-muted); }
.time { white-space: nowrap; text-align: right; color: var(--wa-muted); font-variant-numeric: tabular-nums; }
.marker { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 38px; color: var(--wa-muted); font-size: 11px; }
.marker::before { content: ""; width: 12px; border-top: 1px dashed var(--wa-muted); }
.detail { padding: 2px 12px 12px 38px; display: grid; gap: 10px; }
.detail h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--wa-muted); }
.fills li { display: flex; gap: 8px; font-family: var(--wa-mono); font-size: 11.5px; }
.result-text { margin: 0; white-space: pre-wrap; word-break: break-word; }

/* ---------- json ---------- */
.json { position: relative; }
.json pre {
  margin: 0; padding: 8px 10px; border-radius: 6px; background: var(--wa-bg-subtle); overflow: auto; max-height: 360px;
  white-space: pre; tab-size: 2;
}
.json .copy { position: absolute; top: 4px; right: 4px; }

/* ---------- settings ---------- */
.settings { padding: 12px 16px; display: grid; gap: 14px; max-width: 520px; }
.setting { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.setting .label { font-weight: 600; }
.switch {
  flex: none; width: 32px; height: 18px; border-radius: 9px; border: 0; padding: 2px; background: var(--wa-border); cursor: pointer;
  transition: background-color 0.15s ease-out;
}
.switch::before {
  content: ""; display: block; width: 14px; height: 14px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); transition: transform 0.15s ease-out;
}
.switch[aria-checked="true"] { background: var(--wa-accent); }
.switch[aria-checked="true"]::before { transform: translateX(14px); background: var(--wa-on-accent); }
.switch:disabled { opacity: 0.45; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
`;

let sheet: CSSStyleSheet | null = null;

/** Adopt the panel styles into `root` (a constructable sheet, shared; a `<style>` where unsupported). */
export function adoptStyles(root: ShadowRoot): void {
  if ("adoptedStyleSheets" in ShadowRoot.prototype && typeof CSSStyleSheet.prototype.replaceSync === "function") {
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
    }
    if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return;
  }
  if (root.querySelector("style[data-web-agents]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-web-agents", "");
  style.textContent = css;
  root.prepend(style);
}
