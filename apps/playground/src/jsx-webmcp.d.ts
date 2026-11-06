import "react";

/** The declarative WebMCP attributes, so JSX accepts them. */
declare module "react" {
  interface HTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    /** Boolean attribute: pass `""` to set it. */
    toolautosubmit?: "";
    toolparamdescription?: string;
  }
}
