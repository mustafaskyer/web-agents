"use client";
/** The header on every page: the store's name (home), the search box and the cart's count. */
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { SearchBox } from "./search-box";

export function Header() {
  const { count } = useCart();
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          Field Store
        </Link>
        <SearchBox />
        <Link href="/cart" className="ml-auto text-sm">
          Cart ({count})
        </Link>
      </div>
    </header>
  );
}
