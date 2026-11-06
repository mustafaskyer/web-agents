/** Snippets that repeat a call from the browser console or a test. */

/** `await agent.run("name", {...});`: the devtools' own console helper. */
export const toAgentRunCode = (name: string, args: unknown): string =>
  `await agent.run(${JSON.stringify(name)}, ${JSON.stringify(args, null, 2)});`;

/** The same call through WebMCP directly (Chrome takes the tool object from getTools()). */
export const toExecuteToolCode = (name: string, args: unknown): string =>
  [
    `const tool = (await document.modelContext.getTools()).find((t) => t.name === ${JSON.stringify(name)});`,
    `await document.modelContext.executeTool(tool, ${JSON.stringify(args, null, 2)});`,
  ].join("\n");
