import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { useState } from "react";
import type { Art } from "../data/catalog";

/** Rendered widths per size, for srcset: thumbnails stay small, the gallery gets a sharp image. */
const WIDTHS = { sm: [96, 192], md: [400, 800], lg: [800, 1400] } as const;
const SIZES = { sm: "64px", md: "(max-width: 640px) 50vw, 320px", lg: "(max-width: 1024px) 100vw, 640px" } as const;

const unsplash = (photo: string, w: number): string =>
  `https://images.unsplash.com/${photo}?w=${w}&h=${Math.round(w * 1.25)}&fit=crop&auto=format&q=70`;

export interface ProductArtProps {
  art: Art;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A product image. The gradient tile (from the product's hue) and its initial sit underneath: the placeholder while
 * the photo loads, and what stays if it can't load. Decorative: the product's name is always next to it.
 */
export function ProductArt({ art, name, size = "md", className }: ProductArtProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [small, large] = WIDTHS[size];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid w-full place-items-center overflow-hidden",
        size === "sm" ? "aspect-square rounded-md" : "aspect-[4/5] rounded-xl",
        className,
      )}
      style={{
        background: `radial-gradient(120% 80% at 30% 20%, hsl(${art.hue} 70% 92%), transparent 60%), linear-gradient(${art.angle}deg, hsl(${art.hue} 45% 78%), hsl(${art.hue + 30} 40% 88%))`,
      }}
    >
      <span
        className={cn(
          "font-serif font-medium tracking-tight",
          size === "sm" ? "text-xl" : size === "lg" ? "text-[clamp(6rem,16vw,12rem)]" : "text-[clamp(3rem,9vw,6rem)]",
        )}
        style={{ color: `hsl(${art.hue} 35% 30% / 0.35)` }}
      >
        {name[0]}
      </span>

      {art.photo && !failed && (
        <img
          src={unsplash(art.photo, small)}
          srcSet={`${unsplash(art.photo, small)} ${small}w, ${unsplash(art.photo, large)} ${large}w`}
          sizes={SIZES[size]}
          alt=""
          loading={size === "lg" ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
