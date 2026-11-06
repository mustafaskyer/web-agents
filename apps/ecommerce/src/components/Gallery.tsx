import { type KeyboardEvent, useRef, useState } from "react";
import type { Art } from "../data/catalog";
import styles from "./Gallery.module.css";
import { ProductArt } from "./ProductArt";

/** Main tile and thumbnails; arrow keys move between thumbnails (and switch the image). */
export function Gallery({ images, name }: { images: readonly Art[]; name: string }) {
  const [index, setIndex] = useState(0);
  const thumbs = useRef<HTMLDivElement>(null);
  const current = images[index] ?? images[0];

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : images.length - 1)) % images.length;
    setIndex(next);
    thumbs.current?.querySelectorAll("button")[next]?.focus();
  }

  return (
    <section className={styles.gallery} aria-label={`${name} images`}>
      <div className={styles.main}>
        {current && <ProductArt art={current} name={name} size="lg" />}
        <p className={styles.counter} aria-live="polite">
          {index + 1} / {images.length}
        </p>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a group of buttons, not a form fieldset; arrow keys move between them */}
      <div ref={thumbs} className={styles.thumbs} role="group" aria-label="Images" onKeyDown={onKeyDown}>
        {images.map((art, i) => (
          <button
            key={art.photo ?? `${art.hue}-${art.angle}`}
            type="button"
            aria-label={`Show image ${i + 1}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            <ProductArt art={art} name={name} size="sm" />
          </button>
        ))}
      </div>
    </section>
  );
}
