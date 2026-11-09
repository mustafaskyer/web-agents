"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { SearchBox } from "@/tools/SearchBox";

export function Header() {
  const cart = useCart();
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          Field Store
        </Link>
        <SearchBox />
        <Link href="/cart" className="ml-auto text-sm">
          Cart ({cart.count})
        </Link>
      </div>
    </header>
  );
}
