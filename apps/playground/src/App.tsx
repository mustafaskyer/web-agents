import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter, DEFAULT_MODEL } from "@webmcp-agents/local-agent";
import { usePathname, useWebTool, WebAgentsProvider } from "@webmcp-agents/react";
import { lazy, type MouseEvent, type ReactNode, Suspense } from "react";
import { Orders } from "./Orders";
import { cart, money, PRODUCTS, useCart } from "./store";
import { AddToCartForm } from "./tools/AddToCartForm";
import { ApplyPromoForm } from "./tools/ApplyPromoForm";
import { ClearCartButton } from "./tools/ClearCartButton";
import { tools } from "./tools";
import { PlaceOrderButton } from "./tools/PlaceOrderButton";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV ? lazy(() => import("./Devtools")) : () => null;

// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ models: [DEFAULT_MODEL, "onnx-community/Qwen3-1.7B-ONNX"] })];

/** remove_promo: on while the applied code (and its Remove button) is shown, because this component is mounted. */
function RemovePromo({ code }: { code: string }) {
  const remove = () => cart.removePromo();

  // An agent calls this; the cursor finds the button by its name, "Remove promo 123", which starts with the title.
  useWebTool({
    id: "remove_promo",
    title: "Remove promo",
    description: "Take the applied promo code off the cart. Use when the user asks to drop it.",
    execute: remove,
  });

  return (
    <button type="button" className="link" onClick={remove} aria-label={`Remove promo ${code}`}>
      Remove
    </button>
  );
}

function Totals() {
  const { items, promo, totals } = useCart();
  // Nothing to total; but an applied code stays visible so it can be removed.
  if (items.length === 0 && !promo) return null;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(totals.subtotal)}</dd>
      </div>
      {promo && (
        <div className="discount">
          <dt>
            Promo <code>{promo}</code> <RemovePromo code={promo} />
          </dt>
          <dd>−{money(totals.discount)}</dd>
        </div>
      )}
      <div className="total">
        <dt>Total</dt>
        <dd>{money(totals.total)}</dd>
      </div>
    </dl>
  );
}

function Cart() {
  const { items, orders } = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const lastOrder = orders.at(-1);
  return (
    <section className="cart">
      <header>
        <h2>
          Cart <span className="badge">{count}</span>
        </h2>
        <ClearCartButton />
      </header>
      {items.length === 0 ? (
        <p className="muted">Empty.</p>
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.sku}>
              {i.qty} × {i.name} <span className="muted">{money(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
      )}
      <Totals />
      <ApplyPromoForm />
      <PlaceOrderButton />
      {lastOrder && (
        <p className="muted">
          Last order: {lastOrder.id} · {money(lastOrder.total)}
          {lastOrder.promo ? ` (promo ${lastOrder.promo})` : ""}
        </p>
      )}
    </section>
  );
}

function Shop() {
  return (
    <section className="catalog">
      <h1>Storefront</h1>
      <p className="muted">
        Each card is a WebMCP tool (<code>useWebTool</code> on a React Hook Form form). Open the devtools (bottom right, or Alt+Shift+A) to
        call one.
      </p>
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
  );
}

function NavLink({ to, path, children }: { to: string; path: string; children: ReactNode }) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab
    e.preventDefault();
    if (to !== path) history.pushState(null, "", to); // the library follows the URL: usePathname and `match` see it
  }
  return (
    <a href={to} onClick={onClick} aria-current={to === path ? "page" : undefined}>
      {children}
    </a>
  );
}

export default function App() {
  const path = usePathname();
  return (
    <WebAgentsProvider tools={tools}>
      <nav className="tabs" aria-label="Sections">
        <NavLink to="/" path={path}>
          Shop
        </NavLink>
        <NavLink to="/orders" path={path}>
          Orders
        </NavLink>
      </nav>
      <main className="layout">
        {path === "/orders" ? <Orders /> : <Shop />}
        <Cart />
      </main>
      <AgentChat adapters={ADAPTERS} position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <Suspense>
        <Devtools />
      </Suspense>
    </WebAgentsProvider>
  );
}
