// A stand-in for your app's cart. It is a plain module, not React
// state, so a tool defined outside a component can read it too.
export interface CartLine {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const lines: CartLine[] = [
  { id: "tee-M", name: "Ocean Tee (M)", quantity: 1, price: 28 },
];

export const cart = {
  add(line: CartLine) {
    const same = lines.find((other) => other.id === line.id);
    if (same) same.quantity += line.quantity;
    else lines.push(line);
  },

  total: () =>
    lines.reduce((sum, line) => sum + line.quantity * line.price, 0),

  describe: () => ({ lines: [...lines], total: cart.total() }),
};
