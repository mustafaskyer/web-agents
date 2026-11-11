/** A price as the page and the agent read it, e.g. `$18.00`. */
export const money = (n: number): string => `$${n.toFixed(2)}`;
