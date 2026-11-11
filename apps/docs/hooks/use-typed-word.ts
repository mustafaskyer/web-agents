import { type RefObject, useEffect, useRef, useState } from "react";
import { useMotionPaused } from "@/components/opendesigns/_shared/motion-boundary";

const TYPE_MS = 85;
const DELETE_MS = 40;
/** A finished word stays this long; an emptied slot waits a beat before the next word. */
const HOLD_MS = 2200;
const EMPTY_MS = 320;

/** What <TypedWords> renders. */
export interface TypedWord {
  /** The letters typed so far. */
  text: string;
  /** The typed text's width in px, once measured: the field glides to it. */
  width: number | undefined;
  /** Put on the element holding the typed text, so its width can be measured. */
  ref: RefObject<HTMLSpanElement | null>;
}

/**
 * A word an agent keeps retyping: it types one word, holds it, deletes it and types the next. The first word shows at
 * once (the server renders it); under reduced motion, while motion is paused (a capture) or in a hidden tab, it stays.
 */
export function useTypedWord(words: readonly string[]): TypedWord {
  const first = words[0] ?? "";
  const [text, setText] = useState(first);
  const paused = useMotionPaused();
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  // The field follows its text. An observer, not a measurement per keystroke: the title's size follows the viewport,
  // and the web font arrives after the first paint. Until it reports, the field is simply as wide as its content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || words.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let index = 0;
    let shown = first.length;
    let deleting = true;
    let timer = 0;
    const step = (): void => {
      // A tab nobody is looking at has nothing to type for.
      if (document.hidden) {
        timer = window.setTimeout(step, 1000);
        return;
      }
      const word = words[index] ?? "";
      if (deleting) {
        shown -= 1;
        setText(word.slice(0, shown));
        if (shown > 0) timer = window.setTimeout(step, DELETE_MS);
        else {
          deleting = false;
          index = (index + 1) % words.length;
          timer = window.setTimeout(step, EMPTY_MS);
        }
        return;
      }
      shown += 1;
      setText(word.slice(0, shown));
      if (shown < word.length) timer = window.setTimeout(step, TYPE_MS);
      else {
        deleting = true;
        timer = window.setTimeout(step, HOLD_MS);
      }
    };
    timer = window.setTimeout(step, HOLD_MS);
    return () => clearTimeout(timer);
  }, [words, first, paused]);

  return { text, width, ref };
}
