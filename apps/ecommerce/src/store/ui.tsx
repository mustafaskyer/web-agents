/** Page chrome state the agent can drive too: the cart drawer. */
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

export interface UiApi {
  cartOpen: boolean;
  openCart(): void;
  closeCart(): void;
}

const UiContext = createContext<UiApi | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const api = useMemo<UiApi>(() => ({ cartOpen, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false) }), [cartOpen]);
  return <UiContext.Provider value={api}>{children}</UiContext.Provider>;
}

export function useUi(): UiApi {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("useUi must be used inside <UiProvider>");
  return ui;
}
