/** Formatting shared by the page and the tools' answers: pure, no React. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** `4800` → `$48.00`. Prices are integer cents everywhere. */
export const money = (cents: number): string => usd.format(cents / 100);
