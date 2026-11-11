import { defineWebTool, WebToolError } from "@webmcp-agents/core";
import { STEPS } from "@/components/landing/steps-data";
import { copyStepCode as copy } from "@/lib/clipboard";

/** copy_step_code: press a step's copy button under How it works, and answer the code. */
export const copyStepCode = defineWebTool<{ step: number }, string>({
  id: "copy_step_code",
  title: "Copy a step's code",
  description: `Copy the code of one of the three steps under How it works to the user's clipboard, by pressing that step's copy button: 1 "${STEPS[0]?.title}" (a tool: useWebTool), 2 "${STEPS[1]?.title}" (a tool with input, on a React Hook Form form), 3 "${STEPS[2]?.title}" (the provider, an agent and the chat). Answers the code itself, so you can also show it. Use when the user wants the code to start from. Needs nothing first. Next: copy_install_command, or open_docs quickstart.`,
  inputSchema: {
    type: "object",
    properties: { step: { type: "integer", minimum: 1, maximum: 3, description: "The step's number, 1 to 3, e.g. 1" } },
    required: ["step"],
  },
  readOnly: false,
  repeatable: true,
  // that step's copy button, "Copy the code of step 1"
  target: ({ step } = {} as { step: number }) => ({ role: "button", name: `Copy the code of step ${Number(step)}` }),
  execute: async ({ step }) => {
    const n = Number(step);
    const data = STEPS[n - 1];
    if (!data || !Number.isInteger(n)) throw new WebToolError("invalid_input", `step must be 1, 2 or 3; got ${JSON.stringify(step)}.`);
    const copied = await copy(n);
    return `${copied ? "Copied" : "The browser did not allow the clipboard (the tab needs focus). Here is"} step ${n}, "${data.title}":\n${data.code}`;
  },
});
