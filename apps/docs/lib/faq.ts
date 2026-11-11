/**
 * Opening a question of the home page's FAQ from outside the accordion: `open_faq` asks with a window event, and the
 * page's open question follows it (hooks/use-faq.ts).
 */
import type { FaqTopic } from "@/components/landing/faq-data";

const OPEN_FAQ_EVENT = "webmcp:open-faq";

/** Ask the page to open the question about `topic`. */
export const openFaqQuestion = (topic: FaqTopic): void => {
  window.dispatchEvent(new CustomEvent(OPEN_FAQ_EVENT, { detail: topic }));
};

/** Call `listener` with each topic the page is asked to open. Returns the unsubscribe. */
export function onOpenFaq(listener: (topic: FaqTopic) => void): () => void {
  const handle = (e: Event): void => listener((e as CustomEvent<FaqTopic>).detail);
  window.addEventListener(OPEN_FAQ_EVENT, handle);
  return () => window.removeEventListener(OPEN_FAQ_EVENT, handle);
}
