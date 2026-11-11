/**
 * @webmcp-agents/tools: common WebMCP tools, ready-made. Each factory returns a tool from `defineWebTool`; put them in
 * your catalog beside your own.
 *
 *   import { getTime, getLocation, getPage, goTo, setTheme } from "@webmcp-agents/tools";
 *
 *   export const tools = {
 *     getTime: getTime(),
 *     getPage: getPage(),
 *     goTo: goTo({ pages: { home: "/", cart: "/cart", orders: "/orders" } }),
 *     setTheme: setTheme(),
 *     getCart,
 *   };
 *
 * Framework-free and SSR-safe: nothing touches the DOM until a tool runs. Import only what you use; the rest is
 * tree-shaken.
 */
export { getTime } from "./get-time";
export type { GetTimeOptions, TimeAnswer, TimeInfo } from "./get-time";
export { getLocation } from "./get-location";
export type { GetLocationOptions, LocationAnswer, Place, UserLocation } from "./get-location";
export { getPage } from "./get-page";
export type { GetPageOptions, PageAnswer, PageHeading, PageInfo } from "./get-page";
export { goTo } from "./go-to";
export type { GoToInput, GoToOptions } from "./go-to";
export { goBack } from "./go-back";
export type { GoBackOptions } from "./go-back";
export { scrollTo } from "./scroll-to";
export type { ScrollToInput, ScrollToOptions } from "./scroll-to";
export { setTheme } from "./set-theme";
export type { SetThemeInput, SetThemeOptions, Theme } from "./set-theme";
export { calendarAt, DEFAULT_WEEK, weekOf } from "./calendar";
export type { Calendar, Day, WeekInfo } from "./calendar";
export type { CommonToolOptions } from "./shared";
