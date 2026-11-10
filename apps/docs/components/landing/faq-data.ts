/**
 * The FAQ on the home page: what <FaqAccordion> shows and what `open_faq` opens and answers. Plain data.
 */
import { DOCS } from "@/lib/site";

export const FAQ = [
  {
    id: "webmcp",
    question: "Do I need Chrome's WebMCP to try it?",
    answer:
      "No. In Chrome's origin trial the browser provides document.modelContext; everywhere else the provider loads a polyfill of the same API by itself. The examples run in any browser today, and so do the tools on this page.",
    action: { href: `${DOCS}/more/polyfill`, label: "The polyfill" },
  },
  {
    id: "tools",
    question: "Do my tools have to know about the cursor?",
    answer:
      "No. A tool is an id, a description, an input schema and an execute function. The cursor finds the control it acts on by its name, as a person would: name the tool like its button (its title) and nothing is added to the markup. A target says which control when the name differs; a tool with no control just runs unseen.",
    action: { href: `${DOCS}/build/define-a-tool`, label: "Define a tool" },
  },
  {
    id: "models",
    question: "Which models can the chat use?",
    answer:
      "Any frontier model through the Vercel AI SDK: set WEB_AGENTS_MODEL to provider/model (anthropic, openai, google, deepseek, xai, mistral, openrouter) with that provider's key, or route any id through the AI Gateway. Or run a small model in the visitor's browser with no server at all.",
    action: { href: `${DOCS}/build/add-the-chat`, label: "Pick a model" },
  },
  {
    id: "safety",
    question: "Can an agent place an order on its own?",
    answer:
      "Not through a confirm-gated tool (requireConfirmation: true). The call parks on the button and waits for a trusted click from the person; a script calling click() does not count. The chat shows the parked state and says where to click.",
    action: { href: `${DOCS}/concepts/agent-cursor`, label: "The agent cursor" },
  },
  {
    id: "secrets",
    question: "Where does my API key live?",
    answer:
      "On the server, read by createChatHandler. The browser gets the widget, the page's tool descriptors and the conversation: no SDK, no key. The Vite plugin refuses to start if a VITE_ variable looks like a secret, and the Next.js example taints the key.",
    action: { href: `${DOCS}/installation/nextjs`, label: "Install in Next.js" },
  },
] as const;

export type FaqTopic = (typeof FAQ)[number]["id"];
export const FAQ_TOPICS = FAQ.map((q) => q.id) as [FaqTopic, ...FaqTopic[]];

/** `open_faq` asks the page to open a question with this event (detail: the topic). */
export const OPEN_FAQ_EVENT = "webmcp:open-faq";
