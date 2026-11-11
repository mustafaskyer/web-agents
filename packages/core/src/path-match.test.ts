import { describe, expect, it } from "vitest";
import { matchPath } from "./path-match";

describe("matchPath", () => {
  it.each([
    ["/product/:slug", "/product/mug", true],
    ["/product/:slug", "/product/a/b", false],
    ["/product/:slug", "/product", false],
    ["/checkout", "/checkout/", true],
    ["/checkout/", "/checkout", true],
    ["/checkout", "/Checkout", false],
    ["/flights/*", "/flights", true],
    ["/flights/*", "/flights/", true],
    ["/flights/*", "/flights/x/y", true],
    ["/flights/*", "/flightsx", false],
    ["/", "/", true],
    ["/", "/orders", false],
    ["*", "/anything/at/all", true],
    ["/a.b", "/aXb", false],
    ["/users/:id/orders", "/users/7/orders", true],
  ])("matchPath(%j, %j) → %s", (pattern, pathname, expected) => {
    expect(matchPath(pattern, pathname)).toBe(expected);
  });
});
