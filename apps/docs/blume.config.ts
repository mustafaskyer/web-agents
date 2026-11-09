import { fileURLToPath } from "node:url";
import { defineConfig } from "blume";

const here = fileURLToPath(new URL(".", import.meta.url));

/**
 * The landing page's blocks import "@/components/…" and "@/lib/…", as shadcn writes them. Blume's Astro project
 * lives in the generated .blume/ folder, so this app's tsconfig paths never reach Vite: alias them here.
 */
const appAlias = {
  name: "webmcp-agents:app-alias",
  hooks: {
    "astro:config:setup": ({ updateConfig }: { updateConfig: (config: object) => void }) =>
      updateConfig({ vite: { resolve: { alias: [{ find: /^@\//, replacement: here }] } } }),
  },
};

export default defineConfig({
  title: "WebMCP Agents",
  description:
    "Let AI agents use your web page, and let the person on it see every step: a ghost cursor, fields typed in place, a parked confirm state.",
  // The docs live at the repo root (docs/), next to the code they describe; this app renders them under /docs.
  content: { root: "../../docs", exclude: ["README.md"] }, // docs/README.md is for GitHub only
  // One site: the landing page (pages/index.astro) is the home, every docs route mounts under /docs.
  basePath: "/docs",
  github: { owner: "mustafaskyer", repo: "web-agents", dir: "apps/docs" },
  theme: {
    // the landing page's typefaces, so both halves of the site read as one
    fonts: { display: "geist", body: "geist", mono: "geist-mono" },
  },
  navigation: {
    // Guides and concepts under "Docs"; the per-API pages get their own sidebar under "Reference".
    tabs: [
      { label: "Docs", path: "/" },
      { label: "Reference", path: "/reference" },
    ],
    // The Demos page is a custom page outside the docs (pages/demos.astro): one header link back to it.
    actions: [{ href: "/demos", label: "Demos" }],
  },
  // The production origin (our own domain on Cloudflare), from SITE_URL at build time. Unset, Blume detects the
  // platform's own URL (Cloudflare Pages, Vercel, Netlify); with no URL at all it skips og:image, which must be absolute.
  ...(process.env.SITE_URL ? { deployment: { site: process.env.SITE_URL } } : {}),
  seo: {
    // Per-page social cards for the docs, in the landing's dark palette with the agent cursor as the mark. The home and
    // Demos pages use metadata-gen's card instead (public/metadata/og.png, components/social-meta.astro).
    og: {
      logo: "./public/logo.svg",
      palette: { background: "#0a0a0a", foreground: "#fafafa", muted: "#a3a3a3", border: "#262626", accent: "#fafafa" },
    },
  },
  // The OpenDesigns blocks predate the React Compiler; they run as written.
  react: { compiler: false },
  integrations: [appAlias],
});
