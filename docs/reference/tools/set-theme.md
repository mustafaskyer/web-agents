---
description: "The set_theme tool: light, dark or the system's."
---

# `setTheme`

The `set_theme` tool: light, dark or the system's. Reach for it so an agent can honour "use dark mode". It presses the site's own theme switch when the page has one (found by name with [`locate`](../core/locate.md), like the cursor finds any control), so the site's own code runs and remembers the choice. It calls your `set` when there is no switch, or the switch cannot reach the theme asked for (a two-state switch and "system").

## Import

```ts
import { setTheme } from "@webmcp-agents/tools";
import type { SetThemeInput, SetThemeOptions, Theme } from "@webmcp-agents/tools";
```

## Example

A page with a theme button needs only `setTheme()`. This one keeps its theme in its own state, so it passes `get` and `set`:

<include meta='title="tools/set-theme.ts"'>/_examples/shared/reference/tools/set-theme.ts</include>

## Input

### Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `theme` | `"light" \| "dark" \| "system"` | flip light and dark | The theme to switch to, e.g. `"dark"`; `"system"` follows the device. Left out: flip between light and dark. |

### Options

`setTheme(options?)` takes a `SetThemeOptions`, which extends the options every common tool takes (`id`, `description`).

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `"set_theme"` | The tool's name (`a-z A-Z 0-9 _ . -`, 1 to 128). |
| `description` | `string` | says to use it when the user asks for dark or light mode or to change the colours | What the agent reads to decide when to call it. |
| `get` | `() => Theme \| undefined` | read from `<html>` | The theme in use. Default: `data-theme`, `data-mode` or `data-color-scheme` on `<html>`, else a `dark` or `light` class, else its `color-scheme`, else `"system"`. Pass it when the theme lives in your own state. |
| `set` | `(theme: Theme) => void \| Promise<void>` | none | Apply a theme yourself: used when the page has no switch, or its switch cannot reach the theme asked for. |
| `control` | `ToolLocator \| false` | a switch, then a button, named like a theme | The site's theme switch, e.g. `{ role: "button", name: "Appearance" }`. Default: the first usable switch, else button, whose name matches `/theme\|dark mode\|light mode\|colou?r scheme/i`. `false`: never press one, always `set`. |

## Answer

A sentence (`string`): `The theme is now dark.`, or `The theme is already dark.` when it was.

The switch is pressed up to three times until the theme is the one asked for (a switch may cycle light, dark, system); then `set` is called. When neither can reach it the call fails with `unavailable`: `This page has no theme switch the tool can find, so the theme can't be changed here.` (or `The theme switch on this page doesn't offer "system".`). A value that is not a theme fails with `invalid_input`.

## Notes

- The tool has no flags. Its `target` is the switch it presses, so the cursor goes there; with none, it runs unseen.
- `"system"` counts as reached when `get` (or `<html>`) reports `system`; otherwise it needs `set`.
- A theme button with only an icon needs an `aria-label` ("Toggle theme") for the tool and the cursor to find it, or pass `control`.
- Pressing the site's switch rather than writing a class means the site's own code runs and remembers the choice.

## See also

- [Common tools](../../build/common-tools.mdx), the page that teaches it
- [`locate`](../core/locate.md), how the switch is found
- [`defineWebTool`](../core/define-web-tool.md)
