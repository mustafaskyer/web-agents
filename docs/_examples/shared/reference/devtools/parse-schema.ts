import { parseSchema } from "@webmcp-agents/devtools";

// Chrome returns each inputSchema as a JSON string, the polyfill as
// an object: parseSchema reads both.
const tools = await document.modelContext?.getTools();

for (const tool of tools ?? []) {
  const schema = parseSchema(tool.inputSchema);
  console.log(tool.name, Object.keys(schema.properties ?? {}));
}
