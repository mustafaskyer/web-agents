/** /orders: past orders. The agent sees `list_orders` only on this page: its `match` (webmcp-agents/tools/list-orders.ts). */
import { Card, CardDescription, CardHeader, CardTitle } from "@webmcp-agents/examples-ui/components/card";
import { useOrders } from "../hooks/use-orders";
import { money } from "../lib/money";

export function Orders() {
  const { orders } = useOrders();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet. Orders you place from the cart show up here.</p>
      ) : (
        <ol className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {o.id} <span className="font-normal text-muted-foreground">· {money(o.total)}</span>
                  </CardTitle>
                  <CardDescription>
                    {o.summary}
                    {o.promo ? ` · promo ${o.promo}` : ""}
                  </CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
