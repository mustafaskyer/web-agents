import { defineConfig } from "blume";

export default defineConfig({
  title: "web-agents",
  description: "Show people what a WebMCP agent does on their page: a ghost cursor, fields typed in place, a parked confirm state.",
  // The API reference lives at the repo root (docs/), where every API change updates it; this app only renders it.
  content: { root: "../../docs" },
  github: { owner: "mustafaskyer", repo: "web-agents", dir: "apps/docs" },
});
