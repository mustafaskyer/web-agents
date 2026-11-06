import { type CSSProperties, useState } from "react";
import type { Art } from "../data/catalog";
import styles from "./ProductArt.module.css";

/** Rendered widths per size, for srcset: thumbnails stay small, the gallery gets a sharp image. */
const WIDTHS = { sm: [96, 192], md: [400, 800], lg: [800, 1400] } as const;
const SIZES = { sm: "64px", md: "(max-width: 600px) 45vw, 300px", lg: "(max-width: 960px) 100vw, 640px" } as const;

const unsplash = (photo: string, w: number): string =>
  `https://images.unsplash.com/${photo}?w=${w}&h=${Math.round(w * 1.25)}&fit=crop&auto=format&q=70`;

/**
 * A product image. The gradient tile (from the product's hue) and its initial sit underneath: the placeholder while
 * the photo loads, and what stays if it can't load. Decorative: the product's name is always next to it.
 */
export function ProductArt({ art, name, size = "md" }: { art: Art; name: string; size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const style = { "--hue": art.hue, "--angle": `${art.angle}deg` } as CSSProperties;
  const [small, large] = WIDTHS[size];
  return (
    <div className={styles.art} data-size={size} style={style} aria-hidden="true">
      <span>{name[0]}</span>
      {art.photo && !failed && (
        <img
          src={unsplash(art.photo, small)}
          srcSet={`${unsplash(art.photo, small)} ${small}w, ${unsplash(art.photo, large)} ${large}w`}
          sizes={SIZES[size]}
          alt=""
          loading={size === "lg" ? "eager" : "lazy"}
          decoding="async"
          data-loaded={loaded || undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
