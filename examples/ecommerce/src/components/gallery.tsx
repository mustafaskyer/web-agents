import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { type KeyboardEvent, useRef, useState } from "react";
import type { Art } from "../data/catalog";
import { ProductArt } from "./product-art";

/** Main image and thumbnails; arrow keys move between thumbnails (and switch the image). */
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
    <section aria-label={`${name} images`} className="flex flex-col gap-3 lg:sticky lg:top-24">
      <div className="relative">
        {current && <ProductArt art={current} name={name} size="lg" />}
        <p
          aria-live="polite"
          className="absolute right-3 bottom-3 rounded-full bg-background/80 px-2.5 py-1 text-xs tabular-nums backdrop-blur"
        >
          {index + 1} / {images.length}
        </p>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: a group of buttons, not a form fieldset; arrow keys move between them */}
      <div ref={thumbs} role="group" aria-label="Images" onKeyDown={onKeyDown} className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {images.map((art, i) => (
          <button
            key={art.photo ?? `${art.hue}-${art.angle}`}
            type="button"
            aria-label={`Show image ${i + 1}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-md opacity-70 ring-offset-2 ring-offset-background transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
              i === index && "opacity-100 ring-2 ring-foreground",
            )}
          >
            <ProductArt art={art} name={name} size="sm" />
          </button>
        ))}
      </div>
    </section>
  );
}
