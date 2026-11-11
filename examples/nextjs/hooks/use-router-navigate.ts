"use client";
/** Hands the App Router's `push` to lib/navigate.ts, where the module-level tools navigate. */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { setNavigate } from "@/lib/navigate";

/**
 * Lets the catalog tools (open_product, go_to_page) and search navigate without a page load, so no call is lost. Next
 * has no router outside React: the shell calls this once.
 */
export function useRouterNavigate(): void {
  const router = useRouter();
  useEffect(() => setNavigate((to) => router.push(to)), [router]);
}
