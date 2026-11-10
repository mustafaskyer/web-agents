import {
  callModelContextTool,
  isCancelled,
  listToolDescriptors,
} from "@webmcp-agents/chat";

// What a custom adapter does for each tool call the model makes.
const stop = new AbortController();
const [first] = await listToolDescriptors();

if (first) {
  const output = await callModelContextTool(
    { name: first.name, input: {} },
    { signal: stop.signal, timeoutMs: 60_000 },
  );

  const text = output.content[0]?.text ?? "";
  if (output.isError && !isCancelled(text)) console.warn(text);
}
