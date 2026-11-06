import { CartProvider, PRODUCTS, money, useCart } from "./store";
import { AddToCartForm } from "./tools/AddToCartForm";
import { ApplyPromoForm } from "./tools/ApplyPromoForm";
import { CheckoutForm } from "./tools/CheckoutForm";
import { ClearCartButton } from "./tools/ClearCartButton";

function Totals() {
  const cart = useCart();
  const { subtotal, discount, total } = cart.totals;
  // Nothing to total; but an applied code stays visible so it can be removed.
  if (cart.items.length === 0 && !cart.promo) return null;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      {cart.promo && (
        <div className="discount">
          <dt>
            Promo <code>{cart.promo}</code>{" "}
            <button type="button" className="link" onClick={() => cart.removePromo()} aria-label={`Remove promo ${cart.promo}`}>
              Remove
            </button>
          </dt>
          <dd>−{money(discount)}</dd>
        </div>
      )}
      <div className="total">
        <dt>Total</dt>
        <dd>{money(total)}</dd>
      </div>
    </dl>
  );
}

function Cart() {
  const cart = useCart();
  const count = cart.items.reduce((n, i) => n + i.qty, 0);
  const lastOrder = cart.orders.at(-1);
  return (
    <section className="cart">
      <header>
        <h2>Cart <span className="badge">{count}</span></h2>
        <ClearCartButton />
      </header>
      {cart.items.length === 0 ? (
        <p className="muted">Empty.</p>
      ) : (
        <ul>
          {cart.items.map((i) => (
            <li key={i.sku}>{i.qty} × {i.name} <span className="muted">{money(i.price * i.qty)}</span></li>
          ))}
        </ul>
      )}
      <Totals />
      <ApplyPromoForm />
      <CheckoutForm />
      {lastOrder && (
        <p className="muted">
          Last order: {lastOrder.id} · {money(lastOrder.total)}
          {lastOrder.promo ? ` (promo ${lastOrder.promo})` : ""}
        </p>
      )}
    </section>
  );
}

export default function App() {
  return (
    <CartProvider>
      <main className="layout">
        <section className="catalog">
          <h1>Storefront</h1>
          <p className="muted">Each card is a declarative WebMCP tool. Use the agent console on the right to call one.</p>
          <div className="grid">
            {PRODUCTS.map((p) => (
              <article key={p.sku} className="card">
                <h3>{p.name}</h3>
                <p>{money(p.price)}</p>
                <AddToCartForm product={p} />
              </article>
            ))}
          </div>
        </section>
        <Cart />
      </main>
    </CartProvider>
  );
}
