import { createFileRoute } from "@tanstack/react-router";

import { ClearCart } from "../components/clear-cart";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main>
      <ClearCart />
    </main>
  );
}
