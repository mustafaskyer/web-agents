import { describe, expect, it } from "vitest";
import { allProducts, describeProduct, getProduct, listByCategory, money, related, searchProducts } from "./catalog";

describe("catalog", () => {
  it("ranks name-prefix matches before description matches", () => {
    const names = searchProducts("linen").map((p) => p.name);
    expect(names.slice(0, 2).toSorted()).toEqual(["Linen Shirt", "Linen Throw"]);
    expect(searchProducts("ocean")[0]?.name).toMatch(/^Ocean/);
  });

  it("matches words inside names, case-insensitively", () => {
    expect(searchProducts("TEE").map((p) => p.slug)).toContain("ocean-tee");
  });

  it("filters by category and limits", () => {
    expect(searchProducts("", { category: "home" }).every((p) => p.category === "home")).toBe(true);
    expect(searchProducts("", { limit: 3 })).toHaveLength(3);
    expect(searchProducts("zzz-nothing")).toEqual([]);
  });

  it("throws a readable error for an unknown slug", () => {
    expect(() => getProduct("nope")).toThrow(/Unknown product "nope"/);
  });

  it("lists a category", () => {
    const apparel = listByCategory("apparel");
    expect(apparel.length).toBeGreaterThan(0);
    expect(apparel.every((p) => p.category === "apparel")).toBe(true);
  });

  it("related excludes the product itself and returns at most n, same category first", () => {
    const r = related("ocean-tee", 3);
    expect(r).toHaveLength(3);
    expect(r.map((p) => p.slug)).not.toContain("ocean-tee");
    expect(r[0]?.category).toBe("apparel");
  });

  it("formats cents as dollars", () => {
    expect(money(4800)).toBe("$48.00");
    expect(money(9999)).toBe("$99.99");
    expect(money(0)).toBe("$0.00");
  });

  it("seed data: integer prices, at least five products with variants, one sold out", () => {
    const products = allProducts();
    expect(products.every((p) => Number.isInteger(p.price))).toBe(true);
    expect(products.filter((p) => p.variants).length).toBeGreaterThanOrEqual(5);
    expect(products.some((p) => p.stock === 0)).toBe(true);
    expect(describeProduct(getProduct("ocean-tee"))).toBe("Ocean Tee ($48.00). Size: S, M, L.");
  });
});
