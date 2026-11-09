/**
 * The site's own WebMCP tools: what a visitor does here, as tools any agent can call (Chrome's WebMCP, the devtools,
 * the chips in <TryIt>). Each is a `defineWebTool` definition and none imports the cursor: each acts on one element of
 * the page, found by `toolname="<id>"` or by its `target` (a link in the header or footer, a copy button, an FAQ
 * question, a demo's frame). `search_docs` is the one declarative form (docs-search.tsx).
 *
 * The home page registers `homeTools`, the Demos page `demosTools` (pages/demos.astro).
 */
import { RESPONSE_GRACE_MS } from "@webmcp-agents/core";
import { defineWebTool, type WebTool, WebToolError } from "@webmcp-agents/react";
import { DEMOS, DOCS, DOCS_PAGES, type DocsPage, INSTALL_COMMAND, QUICKSTART, REPO } from "@/lib/site";
import { applyTheme, currentTheme, type Theme } from "@/lib/theme";
import { showDemo } from "./demo-frame";
import { DEMO_IDS, type DemoId, DEMOS as DEMO_LIST } from "./demos-data";
import { FAQ, FAQ_TOPICS, type FaqTopic, OPEN_FAQ_EVENT } from "./faq-data";
import { copyInstallCommand } from "./install-command";
import { copyStepCode } from "./steps";
import { STEPS } from "./steps-data";
import { drawOutline } from "./outline";

/**
 * The first of `selectors` whose element a person can see. Links live in the navbar on wide screens and in the
 * footer on every screen; a link folded into the phone menu has no box for the cursor to fly to.
 */
const visible = (...selectors: string[]): string | undefined =>
  selectors.find((selector) => {
    const el = document.querySelector(selector);
    return !!el && el.getClientRects().length > 0;
  });

/** Answer first, leave after: a page that goes away mid-call cancels the call (CLAUDE.md, "Forms that navigate away"). */
const leaveFor = (href: string): void => {
  setTimeout(() => location.assign(href), RESPONSE_GRACE_MS);
};

const oneOf = <T extends string>(name: string, value: unknown, allowed: readonly T[]): T => {
  if (allowed.includes(value as T)) return value as T;
  throw new WebToolError(
    "invalid_input",
    `${name} must be one of ${allowed.map((a) => `"${a}"`).join(", ")}; got ${JSON.stringify(value)}.`,
  );
};

// ---------- watch ----------

const showDemoTool = defineWebTool<{ demo?: DemoId }, string>({
  id: "show_demo",
  title: "Show a demo",
  description: `Show one of the recorded demos of an agent using an example app, on the Demos page (${DEMOS}): "skyline" books a flight from Riyadh to Dubai, "field-store" shops and checks out to a Riyadh address. On the Demos page it scrolls to that clip, replays it and outlines it; from any other page it opens the Demos page at that clip. Answers what the clip shows and which tools the agent called. Use when the user asks what WebMCP Agents looks like or to see it working. Needs nothing first. Next: open_docs for the example's docs page.`,
  inputSchema: {
    type: "object",
    properties: {
      demo: {
        type: "string",
        enum: DEMO_IDS,
        description: 'Which demo: "skyline" (book a flight) or "field-store" (shop and check out). Default "skyline".',
      },
    },
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  // on the Demos page the clip's frame; elsewhere the Demos link in the header (or the footer on a phone)
  target: ({ demo } = {}) =>
    visible(`[data-demo-bar="${demo ?? "skyline"}"]`, 'header [toolname="show_demo"]', 'footer [toolname="show_demo"]'),
  execute: ({ demo = "skyline" }) => {
    const id = oneOf("demo", demo, DEMO_IDS);
    const data = DEMO_LIST.find((d) => d.id === id);
    const calls = data?.calls
      .split("\n")
      .filter((line) => /^\w+\(/.test(line))
      .map((line) => line.slice(0, line.indexOf("(")));
    const summary = `${data?.title}: ${data?.text} Tools called: ${calls?.join(", ")}.`;
    if (showDemo(id)) return `Replaying the ${data?.app} demo. ${summary}`;
    leaveFor(`${DEMOS}#${id}`);
    return `Opening the Demos page at the ${data?.app} demo (${DEMOS}#${id}). ${summary}`;
  },
});

const showTools = defineWebTool({
  id: "show_tools",
  title: "Show what you can try here",
  description:
    "Point at the row of tools under the title on the home page and outline it. Answers every tool on this page with one line on what it does, so you can tell the user what they can ask for. Use when the user asks what they can do here or what an agent can do on this site. Needs nothing first. Next: any of the tools it lists.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  execute: () => {
    const row = document.querySelector('[toolname="show_tools"]');
    if (!row) throw new WebToolError("unavailable", "The row of tools is on the home page (/).");
    drawOutline(row, { pad: 10, radius: 22 });
    return [
      "The tools on this page:",
      '- show_demo({ demo: "skyline" | "field-store" }): watch an agent book a flight or check out, on the Demos page',
      '- search_docs({ query }): search the docs, e.g. "confirm"',
      `- open_docs({ page }): open a docs page by name (${Object.keys(DOCS_PAGES).join(", ")})`,
      `- open_faq({ topic }): open an answer in the FAQ (${FAQ_TOPICS.join(", ")})`,
      "- copy_step_code({ step: 1 | 2 | 3 }): copy a step's code from How it works",
      "- copy_install_command(): copy the install command",
      '- toggle_theme({ theme?: "light" | "dark" }): switch the theme',
      "- open_github(): open the source on GitHub (the user clicks to confirm)",
    ].join("\n");
  },
});

// ---------- read ----------

const openDocs = defineWebTool<{ page?: DocsPage }, string>({
  id: "open_docs",
  title: "Open a docs page",
  description: `Leave this page for one page of the docs (${DOCS}), named by "page". Use when the user wants to get started (quickstart), asks how something works (tools, agent-cursor, define-web-tool, chat, agents, polyfill), wants a framework guide (vite, nextjs, tanstack-start), or the API reference (reference). For a topic not listed, use search_docs first. Needs nothing first. This page's tools end with the navigation; the docs have their own search.`,
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: Object.keys(DOCS_PAGES),
        description: 'The page, e.g. "quickstart" or "agent-cursor". Default "quickstart".',
      },
    },
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  // the Quickstart link for the quickstart, the header's Docs link for any other page
  target: ({ page } = {}) =>
    (page ?? "quickstart") === "quickstart"
      ? visible(`header a[href="${QUICKSTART}"]`, `footer a[href="${QUICKSTART}"]`)
      : visible(`header a[href="${DOCS}"]`, `footer a[href="${DOCS}/reference"]`),
  execute: ({ page = "quickstart" }) => {
    const name = oneOf("page", page, Object.keys(DOCS_PAGES) as DocsPage[]);
    const { title, path } = DOCS_PAGES[name];
    const href = `${DOCS}${path}`;
    leaveFor(href);
    return `Opening "${title}" at ${href}.`;
  },
});

const openFaq = defineWebTool<{ topic: FaqTopic }, string>({
  id: "open_faq",
  title: "Open an FAQ answer",
  description: `Open one question of the FAQ on the home page and answer it: "webmcp" (do I need Chrome's WebMCP), "tools" (do tools know about the cursor), "models" (which models the chat uses), "safety" (can an agent order on its own), "secrets" (where the API key lives). Answers the question, the answer and the docs page for more. Use when the user asks one of these, before reading the docs. Needs nothing first. Next: open_docs for the page the answer names.`,
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", enum: FAQ_TOPICS, description: 'The question\'s topic, e.g. "safety"' },
    },
    required: ["topic"],
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  target: ({ topic } = {} as { topic: FaqTopic }) => `[data-faq="${topic}"] [data-slot="accordion-trigger"]`,
  execute: ({ topic }) => {
    const id = oneOf("topic", topic, FAQ_TOPICS);
    const q = FAQ.find((item) => item.id === id);
    if (!q || !document.querySelector(`[data-faq="${id}"]`)) throw new WebToolError("unavailable", "The FAQ is on the home page (/).");
    window.dispatchEvent(new CustomEvent(OPEN_FAQ_EVENT, { detail: id }));
    return `${q.question} ${q.answer} More: ${q.action.label} (${q.action.href}).`;
  },
});

// ---------- do ----------

const copyStep = defineWebTool<{ step: number }, string>({
  id: "copy_step_code",
  title: "Copy a step's code",
  description: `Copy the code of one of the three steps under How it works to the user's clipboard, by pressing that step's copy button: 1 "${STEPS[0]?.title}" (defineWebTool), 2 "${STEPS[1]?.title}" (WebAgentsProvider), 3 "${STEPS[2]?.title}" (defineWebAgent and the chat). Answers the code itself, so you can also show it. Use when the user wants the code to start from. Needs nothing first. Next: copy_install_command, or open_docs quickstart.`,
  inputSchema: {
    type: "object",
    properties: { step: { type: "integer", minimum: 1, maximum: 3, description: "The step's number, 1 to 3, e.g. 1" } },
    required: ["step"],
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  target: ({ step } = {} as { step: number }) => `[data-step-copy="${Number(step)}"]`,
  execute: async ({ step }) => {
    const n = Number(step);
    const data = STEPS[n - 1];
    if (!data || !Number.isInteger(n)) throw new WebToolError("invalid_input", `step must be 1, 2 or 3; got ${JSON.stringify(step)}.`);
    const copied = await copyStepCode(n);
    return `${copied ? "Copied" : "The browser did not allow the clipboard (the tab needs focus). Here is"} step ${n}, "${data.title}":\n${data.code}`;
  },
});

const copyInstall = defineWebTool({
  id: "copy_install_command",
  title: "Copy the install command",
  description:
    "Copy the command that installs the packages (core, react, chat) to the user's clipboard, by pressing the copy button next to it. Answers the command itself, so you can also show it. Use when the user wants to install or try WebMCP Agents. Needs nothing first. Next: open_docs quickstart for the steps after installing.",
  annotations: { readOnlyHint: false, idempotentHint: true },
  execute: async () =>
    (await copyInstallCommand())
      ? `Copied to the clipboard: ${INSTALL_COMMAND}`
      : `The browser did not allow the clipboard (the tab needs focus). The command is: ${INSTALL_COMMAND}`,
});

const toggleTheme = defineWebTool<{ theme?: Theme }, string>({
  id: "toggle_theme",
  title: "Switch the theme",
  description:
    'Switch the site between its light and dark theme by pressing the theme button in the header; the choice is remembered and carries over to the docs. Answers the theme now on screen. Use when the user asks for dark mode, light mode or to change the colours. Needs nothing first. Pass "theme" to set one, or nothing to flip it.',
  inputSchema: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        enum: ["light", "dark"],
        description: 'The theme the user asked for, e.g. "dark". Leave out to flip the current one.',
      },
    },
  },
  annotations: { readOnlyHint: false, idempotentHint: false },
  execute: ({ theme }) => {
    if (theme !== undefined) oneOf("theme", theme, ["light", "dark"] as const);
    const next = theme ?? (currentTheme() === "dark" ? "light" : "dark");
    applyTheme(next);
    return `The theme is now ${next}. Call toggle_theme again to switch back.`;
  },
});

const openGithub = defineWebTool({
  id: "open_github",
  title: "Open the GitHub repository",
  description: `Open the project's source on GitHub (${REPO}) in a new tab. Leaving the site is the user's call: the cursor parks on the GitHub link and the call waits until they click it themselves. Use when the user asks for the source, the issues or to star the project. Needs nothing first. Nothing comes next on this page.`,
  annotations: { readOnlyHint: false, openWorldHint: true },
  requireConfirmation: true,
  target: () => visible('header [toolname="open_github"]', 'footer [toolname="open_github"]'),
  execute: () => {
    // Runs right after the person's own click, so the new tab is theirs to open; a blocked popup falls back to this
    // tab. ("noopener" in the features would make open() answer null either way.)
    const tab = window.open(REPO, "_blank");
    if (tab) tab.opener = null;
    else leaveFor(REPO);
    return `Opened ${REPO}${tab ? " in a new tab" : ""}.`;
  },
});

/** The home page's imperative tools; all are on while the page is. */
export const homeTools: readonly WebTool[] = [
  showDemoTool,
  showTools,
  openDocs,
  openFaq,
  copyStep,
  copyInstall,
  toggleTheme,
  openGithub,
] as readonly WebTool[];

/** The Demos page's tools: the demos themselves, plus what the header and footer offer everywhere. */
export const demosTools: readonly WebTool[] = [showDemoTool, openDocs, copyInstall, toggleTheme, openGithub] as readonly WebTool[];
