/** Side-effect entry: `import "@web-agents/polyfill/auto"` installs the polyfill if the browser has no WebMCP. */
import { installWebMCPPolyfill } from "./index";

installWebMCPPolyfill();
