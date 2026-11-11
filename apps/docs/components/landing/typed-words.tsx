"use client";

/**
 * A word in a sentence that an agent keeps retyping: it types one word, holds it, deletes it and types the next,
 * like the cursor filling a field. The field is as wide as what is typed in it and glides to each new width, so
 * the sentence around it moves smoothly instead of jumping a letter at a time. The server renders the first word;
 * under reduced motion (and while the page is captured) it simply stays.
 */
import { useTypedWord } from "@/hooks/use-typed-word";

export interface TypedWordsProps {
  /** The words to cycle through, the first one shown at once. */
  words: readonly string[];
}

export const TypedWords = ({ words }: TypedWordsProps) => {
  const { text, width, ref } = useTypedWord(words);

  return (
    <span className="typed-words" style={width === undefined ? undefined : { width }}>
      {/* Read once, as a list: assistive tech should not hear a word being spelled out again and again. */}
      <span className="sr-only">{words.join(", ")}</span>
      <span ref={ref} className="typed-words__text" aria-hidden="true">
        {text}
        <i className="typed-words__caret" />
      </span>
    </span>
  );
};
