"use client";

/**
 * A word in a sentence that an agent keeps retyping: it types one word, holds it, deletes it and types the next,
 * like the cursor filling a field. The field is as wide as what is typed in it and glides to each new width, so
 * the sentence around it moves smoothly instead of jumping a letter at a time. The server renders the first word;
 * under reduced motion (and while the page is captured) it simply stays.
 */
import { useEffect, useRef, useState } from "react";
import { useMotionPaused } from "@/components/opendesigns/_shared/motion-boundary";

export interface TypedWordsProps {
  /** The words to cycle through, the first one shown at once. */
  words: readonly string[];
}

const TYPE_MS = 85;
const DELETE_MS = 40;
/** A finished word stays this long; an emptied slot waits a beat before the next word. */
const HOLD_MS = 2200;
const EMPTY_MS = 320;

export const TypedWords = ({ words }: TypedWordsProps) => {
  const first = words[0] ?? "";
  const [text, setText] = useState(first);
  const paused = useMotionPaused();
  const typed = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  // The field follows its text. An observer, not a measurement per keystroke: the title's size follows the viewport,
  // and the web font arrives after the first paint. Until it reports, the field is simply as wide as its content.
  useEffect(() => {
    const el = typed.current;
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

  return (
    <span className="typed-words" style={width === undefined ? undefined : { width }}>
      {/* Read once, as a list: assistive tech should not hear a word being spelled out again and again. */}
      <span className="sr-only">{words.join(", ")}</span>
      <span ref={typed} className="typed-words__text" aria-hidden="true">
        {text}
        <i className="typed-words__caret" />
      </span>
    </span>
  );
};
