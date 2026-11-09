/** Where the site's links and tools point. The docs are the same site, mounted under /docs (blume.config.ts `basePath`). */
export const REPO = "https://github.com/mustafaskyer/web-agents";
export const DOCS = "/docs";
export const DEMOS = "/demos";
export const QUICKSTART = `${DOCS}/getting-started/quickstart`;
export const INSTALL_COMMAND = "pnpm add @webmcp-agents/core @webmcp-agents/react @webmcp-agents/chat";

/** The docs pages a tool (`open_docs`) can open by name: the ones a visitor asks for first. Paths are under DOCS. */
export const DOCS_PAGES = {
  quickstart: { title: "Quickstart", path: "/getting-started/quickstart" },
  tools: { title: "Tools", path: "/concepts/tools" },
  "agent-cursor": { title: "The agent cursor", path: "/concepts/agent-cursor" },
  "define-web-tool": { title: "defineWebTool", path: "/reference/core/define-web-tool" },
  chat: { title: "Add a chat", path: "/guides/chat" },
  agents: { title: "Define an agent", path: "/guides/agents" },
  polyfill: { title: "The polyfill", path: "/guides/polyfill" },
  vite: { title: "Vite", path: "/frameworks/vite" },
  nextjs: { title: "Next.js", path: "/frameworks/nextjs" },
  "tanstack-start": { title: "TanStack Start", path: "/frameworks/tanstack-start" },
  reference: { title: "API reference", path: "/reference" },
} as const;
export type DocsPage = keyof typeof DOCS_PAGES;
