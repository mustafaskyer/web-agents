import { detectLocalProviders } from "@webmcp-agents/local-agent";

// What could run here, for a settings screen. Nothing downloads.
const found = await detectLocalProviders();

for (const { id, availability } of found) {
  console.log(id, availability.state);
}
// prompt-api unavailable
// transformers needs-download
