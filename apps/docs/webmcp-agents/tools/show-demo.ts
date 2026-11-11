import { defineWebTool } from "@webmcp-agents/core";
import { DEMO_IDS, type DemoId, DEMOS as DEMO_LIST } from "@/components/landing/demos-data";
import { demoFrame, showDemo as replayDemo } from "@/lib/demo-frame";
import { DEMOS } from "@/lib/site";
import { leaveFor, oneOf } from "./shared";

/** show_demo: replay a recorded demo on the Demos page, or open the Demos page at it. */
export const showDemo = defineWebTool<{ demo?: DemoId }, string>({
  id: "show_demo",
  title: "Show a demo",
  description: `Show one of the recorded demos of an agent using an example app, on the Demos page (${DEMOS}): "skyline" books a flight from Riyadh to Dubai, "field-store" shops and checks out to a Riyadh address. On the Demos page it scrolls to that clip, replays it and outlines it; from any other page it opens the Demos page at that clip. Answers what the clip shows and which tools the agent called. Use when the user asks what WebMCP Agents looks like or to see it working. Needs nothing first. Next: open_docs for the example's docs page.`,
  inputSchema: {
    type: "object",
    properties: {
      demo: {
        type: "string",
        enum: DEMO_IDS,
        description: 'Which demo: "skyline" (book a flight) or "field-store" (shop and check out). Default "skyline".',
      },
    },
  },
  readOnly: true,
  repeatable: true,
  // on the Demos page the clip's frame; elsewhere the Demos link (the header's, or the footer's on a phone)
  target: ({ demo } = {}) => demoFrame(demo ?? "skyline") ?? { role: "link", name: "Demos" },
  execute: ({ demo = "skyline" }) => {
    const id = oneOf("demo", demo, DEMO_IDS);
    const data = DEMO_LIST.find((d) => d.id === id);
    const calls = data?.calls
      .split("\n")
      .filter((line) => /^\w+\(/.test(line))
      .map((line) => line.slice(0, line.indexOf("(")));
    const summary = `${data?.title}: ${data?.text} Tools called: ${calls?.join(", ")}.`;
    if (replayDemo(id)) return `Replaying the ${data?.app} demo. ${summary}`;
    leaveFor(`${DEMOS}#${id}`);
    return `Opening the Demos page at the ${data?.app} demo (${DEMOS}#${id}). ${summary}`;
  },
});
