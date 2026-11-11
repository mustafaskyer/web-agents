import { Suspense } from "react";
import { CartView } from "@/components/cart-view";

export default function CartPage() {
  // CartView reads ?placed= (useSearchParams): the boundary keeps the rest of the page prerendered.
  return (
    <Suspense>
      <CartView />
    </Suspense>
  );
}
