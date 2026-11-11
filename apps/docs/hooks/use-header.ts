import { useSyncExternalStore } from "react";
import { getHeader, type HeaderState, SERVER_HEADER, subscribeHeader } from "@/lib/header";

/** The site header's state (lib/header.ts): folded into the menu or not, the menu open or not. */
export const useHeader = (): HeaderState => useSyncExternalStore(subscribeHeader, getHeader, () => SERVER_HEADER);
