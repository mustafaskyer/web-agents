/**
 * Renders children into a shadow root on a `[data-web-agents-ui]` host, so the
 * panel is style-isolated and input inside it never makes the agent cursor yield.
 *
 * Floating (default): the host is appended to `document.body`.
 * `inline`: the host is rendered in place and fills its container (the TanStack Devtools tab).
 */
import { UI_HOST_ATTR } from "@webmcp-agents/core";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adoptStyles } from "./styles";

/** Props of `ShadowHost`. */
export interface ShadowHostProps {
  children: ReactNode;
  /** Render the host in place, filling the parent, instead of floating on `document.body`. */
  inline?: boolean;
}

const attach = (host: HTMLElement): ShadowRoot => {
  // StrictMode re-runs effects on the same element; a host can only be attached once.
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  adoptStyles(root);
  return root;
};

/** Portal `children` into an isolated, styled shadow root. */
export function ShadowHost({ children, inline = false }: ShadowHostProps) {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const inlineHost = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (inline) {
      if (inlineHost.current) setRoot(attach(inlineHost.current));
      return;
    }
    const host = document.createElement("div");
    host.setAttribute(UI_HOST_ATTR, "devtools");
    document.body.append(host);
    setRoot(attach(host));
    return () => {
      host.remove();
      setRoot(null);
    };
  }, [inline]);

  const portal = root ? createPortal(children, root) : null;
  if (!inline) return portal;
  return (
    <div ref={inlineHost} {...{ [UI_HOST_ATTR]: "devtools" }} style={{ height: "100%" }}>
      {portal}
    </div>
  );
}
