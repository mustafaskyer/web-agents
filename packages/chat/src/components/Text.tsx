/** Plain text with paragraph breaks: model output is never rendered as HTML. */
export function Text({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs of one streaming text, only ever appended to
          <p key={i}>{p}</p>
        ))}
    </>
  );
}
