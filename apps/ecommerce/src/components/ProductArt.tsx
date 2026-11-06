import type { CSSProperties } from "react";
import type { Art } from "../data/catalog";
import styles from "./ProductArt.module.css";

/** A generated tile instead of a photo: a gradient from the product's hue, and its initial. */
export function ProductArt({ art, name, size = "md" }: { art: Art; name: string; size?: "sm" | "md" | "lg" }) {
  const style = { "--hue": art.hue, "--angle": `${art.angle}deg` } as CSSProperties;
  return (
    <div className={styles.art} data-size={size} style={style} aria-hidden="true">
      <span>{name[0]}</span>
    </div>
  );
}
