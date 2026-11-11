import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { Card, CardContent } from "@webmcp-agents/examples-ui/components/card";
import { Separator } from "@webmcp-agents/examples-ui/components/separator";
import { CheckIcon } from "lucide-react";
import { Link } from "react-router";
import { useOrderPage } from "../hooks/use-order-page";
import { money } from "../lib/format";
import { NotFound } from "./not-found";

export function OrderConfirmed() {
  const page = useOrderPage();
  if (!page) return <NotFound />;
  const { order, firstName, lines } = page;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-foreground text-background">
            <CheckIcon className="size-6" aria-hidden="true" />
          </span>

          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-3xl tracking-tight">Order {order.id} confirmed</h1>
            <p className="text-muted-foreground">
              Thanks, {firstName}. A receipt is on its way to {order.contact.email}.
            </p>
          </div>

          <ul className="flex w-full flex-col gap-2 text-left text-sm">
            {lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-4">
                <span>
                  {line.qty} × {line.label}
                </span>
                <span className="tabular-nums">{money(line.total)}</span>
              </li>
            ))}
            <Separator className="my-1" />
            <li className="flex justify-between gap-4 font-medium">
              <span>Total{order.promo ? ` (promo ${order.promo})` : ""}</span>
              <span className="tabular-nums">{money(order.totals.total)}</span>
            </li>
          </ul>

          <p className="text-sm text-muted-foreground">
            Shipping to {order.contact.address}, {order.contact.postcode} {order.contact.city}, {order.contact.country}.
          </p>

          <Link to="/products" className={cn(buttonVariants({ size: "lg", className: "h-11 px-5" }))}>
            Continue shopping
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
