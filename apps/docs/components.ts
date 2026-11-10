import { defineComponents } from "blume";
import RememberFramework from "./components/docs/remember-framework.astro";

/** Components every docs page (`docs/**.mdx`) can use with no import. */
export default defineComponents({
  mdx: {
    // On the installation pages: saves the reader's framework for the pages written in views.
    RememberFramework,
  },
});
