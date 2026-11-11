/**
 * The site header's state, shared by the header (which renders from it) and the tools that act on its links: whether
 * the bar has folded its links into the menu (a narrow window, or the bar compacted on scroll), and whether that menu
 * is open. React reads it with `useSyncExternalStore`; tools read and set it directly.
 */

/** The header now. */
export interface HeaderState {
  /** The links are in the menu: only the menu button is in the bar. */
  collapsed: boolean;
  /** The menu is open. */
  menuOpen: boolean;
}

let state: HeaderState = { collapsed: false, menuOpen: false };
const listeners = new Set<() => void>();
const set = (next: Partial<HeaderState>): void => {
  if (Object.entries(next).every(([key, value]) => state[key as keyof HeaderState] === value)) return;
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

/** Subscribe to the header (for `useSyncExternalStore`). */
export const subscribeHeader = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The header now. */
export const getHeader = (): HeaderState => state;

/** The server's header: never folded, the menu closed. */
export const SERVER_HEADER: HeaderState = { collapsed: false, menuOpen: false };

/** The bar folded its links into the menu, or unfolded them (the menu closes with them). */
export const setHeaderCollapsed = (collapsed: boolean): void => set(collapsed ? { collapsed } : { collapsed, menuOpen: false });

/** Open or close the menu. */
export const setMenuOpen = (menuOpen: boolean): void => set({ menuOpen });
