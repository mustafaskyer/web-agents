import { defineWebTool, locate, WebToolError } from "@webmcp-agents/core";
import { FAQ, FAQ_TOPICS, type FaqTopic } from "@/components/landing/faq-data";
import { openFaqQuestion } from "@/lib/faq";
import { oneOf } from "./shared";

/** open_faq: open one question of the home page's FAQ and answer it. */
export const openFaq = defineWebTool<{ topic: FaqTopic }, string>({
  id: "open_faq",
  title: "Open an FAQ answer",
  description: `Open one question of the FAQ on the home page and answer it: "webmcp" (do I need Chrome's WebMCP), "tools" (do tools know about the cursor), "models" (which models the chat uses), "safety" (can an agent order on its own), "secrets" (where the API key lives). Answers the question, the answer and the docs page for more. Use when the user asks one of these, before reading the docs. Needs nothing first. Next: open_docs for the page the answer names.`,
  inputSchema: {
    type: "object",
    properties: {
      topic: { type: "string", enum: FAQ_TOPICS, description: 'The question\'s topic, e.g. "safety"' },
    },
    required: ["topic"],
  },
  readOnly: true,
  repeatable: true,
  // that question's button in the FAQ
  target: ({ topic } = {} as { topic: FaqTopic }) => {
    const question = FAQ.find((item) => item.id === topic)?.question;
    return question ? { role: "button", name: question } : undefined;
  },
  execute: ({ topic }) => {
    const id = oneOf("topic", topic, FAQ_TOPICS);
    const q = FAQ.find((item) => item.id === id);
    if (!q || !locate({ role: "button", name: q.question })) throw new WebToolError("unavailable", "The FAQ is on the home page (/).");
    openFaqQuestion(id);
    return `${q.question} ${q.answer} More: ${q.action.label} (${q.action.href}).`;
  },
});
