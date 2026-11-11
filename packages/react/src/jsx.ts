/**
 * The declarative WebMCP attributes, so JSX accepts them on any element:
 *
 *   <form toolname="apply_promo" tooldescription="Apply a promo code" toolautosubmit="">
 *
 * Type-only. It reaches consumers through `export type {} from "./jsx"` in the
 * package index, so it ships in the .d.ts without a side-effect import.
 */
export {};

declare module "react" {
  interface HTMLAttributes<T> {
    /** Registers the form as a WebMCP tool with this name; on other elements, names the element a tool acts on. */
    toolname?: string;
    tooldescription?: string;
    /** Boolean attribute: pass `""` to set it. Lets the agent submit without the user's confirmation. */
    toolautosubmit?: "";
    /** Describes a form field to the agent. */
    toolparamdescription?: string;
  }
}
