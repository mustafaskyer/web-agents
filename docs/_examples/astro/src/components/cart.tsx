import { ClearCart } from "./clear-cart";
import { Providers } from "./providers";

// One island: the provider and the components whose tools it shows.
export function Cart() {
  return (
    <Providers>
      <ClearCart />
    </Providers>
  );
}
