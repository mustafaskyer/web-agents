/** The storefront's products: one card, and one add_to_cart_<sku> tool, each. */
export interface Product {
  sku: string;
  name: string;
  price: number;
}

export const PRODUCTS: readonly Product[] = [
  { sku: "mug-01", name: "Enamel mug", price: 18 },
  { sku: "tee-02", name: "Logo tee", price: 29 },
  { sku: "cap-03", name: "Wool cap", price: 24 },
];
