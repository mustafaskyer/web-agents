import { inspectTools } from "@webmcp-agents/core";

for (const { tool, by, controls, fields } of inspectTools()) {
  // A confirm-gated tool needs exactly one control to click.
  if (tool.requireConfirmation && controls.length !== 1) {
    console.warn(`${tool.id}: ${controls.length} found by ${by}`);
  }

  for (const { name, field } of fields) {
    if (!field) console.info(`${tool.id}: no field for "${name}"`);
  }
}
