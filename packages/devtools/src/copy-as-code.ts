/** Snippets that repeat a call from the browser console or a test. */

/** `await agent.invoke("name", {...});`: the devtools' own console helper. */
export const toAgentInvokeCode = (name: string, args: unknown): string =>
  `await agent.invoke(${JSON.stringify(name)}, ${JSON.stringify(args, null, 2)});`;

/** @deprecated The same as `toAgentInvokeCode` (the helper was called `agent.run`, which still works). */
export const toAgentRunCode = toAgentInvokeCode;

/** The same call through WebMCP directly (Chrome takes the tool object from getTools()). */
export const toExecuteToolCode = (name: string, args: unknown): string =>
  [
    `const tool = (await document.modelContext.getTools()).find((t) => t.name === ${JSON.stringify(name)});`,
    `await document.modelContext.executeTool(tool, ${JSON.stringify(args, null, 2)});`,
  ].join("\n");
