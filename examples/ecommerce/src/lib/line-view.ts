/** A cart or order line as the page shows it: pure, so the drawer, checkout and the order page name lines alike. */
import { type Art, findProduct } from "../data/catalog.ts";
import { type CartLine, lineLabel } from "../store/cart-rules.ts";

export interface LineView {
  /** Unique per line: a product can be in the cart in two sizes. */
  key: string;
  slug: string;
  variant: string | null;
  name: string;
  /** "Ocean Tee (M)": the name the line's controls are labelled with (the drawer tools' targets build the same). */
  label: string;
  qty: number;
  /** Cents: unit price × quantity. */
  total: number;
  /** The product's first image, when the product is still in the catalog. */
  art: Art | undefined;
}

export function lineView(line: CartLine): LineView {
  return {
    key: `${line.slug}:${line.variant}`,
    slug: line.slug,
    variant: line.variant,
    name: line.name,
    label: lineLabel(line),
    qty: line.qty,
    total: line.unitPrice * line.qty,
    art: findProduct(line.slug)?.images[0],
  };
}
