import { describe, expect, it } from "vitest";
import { getProduct } from "../data/catalog";
import { addLine, type CartLine, checkQty, findLine, PROMO_CODE, resolveVariant, SHIPPING, totalsFor } from "./cartRules";

const line = (unitPrice: number, qty = 1): CartLine => ({ slug: "x", variant: null, qty, name: "X", unitPrice });

describe("cart rules", () => {
  it("free shipping from $100: boundary", () => {
    expect(totalsFor([line(9999)], null).shipping).toBe(SHIPPING);
    expect(totalsFor([line(10000)], null).shipping).toBe(0);
    expect(totalsFor([line(10001)], null).shipping).toBe(0);
    expect(totalsFor([], null)).toEqual({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
  });

  it("promo: 10% off, rounded to the cent, applied before the shipping threshold", () => {
    const t = totalsFor([line(1999, 3)], PROMO_CODE); // 5997 → 600 off
    expect(t.discount).toBe(600);
    expect(t.total).toBe(5997 - 600 + SHIPPING);
    expect(totalsFor([line(10500)], PROMO_CODE).shipping).toBe(SHIPPING); // 10500 − 1050 < 10000
    expect(totalsFor([line(1000)], "OTHER").discount).toBe(0);
  });

  it("requires a variant when the product has them", () => {
    const tee = getProduct("ocean-tee");
    expect(() => resolveVariant(tee, undefined)).toThrow("Choose a Size for Ocean Tee: S, M, L.");
    expect(() => resolveVariant(tee, "XL")).toThrow(/Choose S, M or L/);
    expect(resolveVariant(tee, "m")).toBe("M");
    expect(resolveVariant(getProduct("canvas-tote"), null)).toBeNull();
    expect(() => resolveVariant(getProduct("canvas-tote"), "M")).toThrow(/has no options/);
  });

  it("bounds the quantity by stock, counting the cart", () => {
    const tray = getProduct("nesting-bowls"); // stock 3
    expect(() => checkQty(tray, 0)).toThrow(/from 1 to 3/);
    expect(() => checkQty(tray, 1.5)).toThrow(/whole number/);
    expect(() => checkQty(tray, 2, 2)).toThrow(/from 1 to 1 \(2 already in the cart\)/);
    expect(() => checkQty(getProduct("leather-cardholder"), 1)).toThrow(/sold out/);
    expect(() => checkQty(tray, 3)).not.toThrow();
  });

  it("merges lines of the same product and variant", () => {
    const tee = getProduct("ocean-tee");
    let lines = addLine([], tee, "M", 1);
    lines = addLine(lines, tee, "M", 2);
    lines = addLine(lines, tee, "S", 1);
    expect(lines.map((l) => [l.variant, l.qty])).toEqual([
      ["M", 3],
      ["S", 1],
    ]);
    expect(() => findLine(lines, "ocean-tee")).toThrow(/pass the variant/);
    expect(findLine(lines, "ocean-tee", "s").qty).toBe(1);
    expect(() => findLine(lines, "mug")).toThrow(/isn't in the cart/);
  });
});
