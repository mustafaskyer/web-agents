# `@web-agents/core/cursor.css`

The stylesheet for the visual layer: the ghost cursor, click ripple, name tag, focus ring, spotlight, the screen-reader live region, and the browser's native agent states. Import it once next to [`installAgentVisuals`](./install-agent-visuals.md); the layer creates the elements, the stylesheet makes them visible.

```ts
import "@web-agents/core/cursor.css";
```

## Signature

A CSS file exported as `@web-agents/core/cursor.css` (the package lists `**/*.css` as having side effects).

## Custom properties

Set on `:root`. Override them to restyle the agent.

| Property | Default | Description |
|---|---|---|
| `--agent` | `#111111` | The agent's colour: fill for the arrow and the tag background. |
| `--agent-ink` | `#ffffff` | Text on the tag. |
| `--agent-strong` | `#111111` | Outlines, rings and borders. |
| `--agent-soft` | `rgba(17, 17, 17, 0.14)` | Soft fill for the halo, ripple and ring flash. |
| `--agent-wait` | `#111111` | Colour while waiting for the user. |
| `--agent-wait-soft` | `rgba(17, 17, 17, 0.18)` | Soft fill while waiting for the user. |
| `--agent-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Easing for fades. |
| `--agent-z` | `2147483000` | Base z-index for the cursor, ripple and tag; the ring sits at `calc(var(--agent-z) - 1)`. Devtools and chat render at `calc(var(--agent-z) + 100)`. |

The spotlight also reads `--agent-spot-blur` (default `4px`) and `--agent-spot-dim` (default `0.08`). The layer sets them inline from the `spotlight` option; you don't set them yourself.

## What it styles

| Selector | What |
|---|---|
| `.agent-cursor`, `.agent-cursor__arrow`, `.agent-cursor__halo` | The arrow (black with a white edge) and the halo that breathes while waiting. Position and tilt are written by script; CSS owns opacity and colour. |
| `.agent-ripple` | The click ripple at the tip. |
| `.agent-tag` | The name tag. Hidden when empty. |
| `.agent-ring` | The focus ring that glides between elements; flashes on click, pulses while waiting. |
| `.agent-spotlight` | The blur and dim layer (z-index `2147481000`). Never takes pointer events. |
| `.agent-sr-only` | The visually hidden live region for screen readers. |
| `form:tool-form-active`, `form[data-tool-form-active]` | The form the agent is filling: dashed outline. |
| `button:tool-submit-active`, `button[data-tool-submit-active]` | The submit button the browser paused on. |
| `[data-agent-active]` | A non-form element while its imperative tool runs. |

State classes: `is-visible`, `is-waiting`, `is-flashing`, and `is-yielded` (the cursor and tag fade in 80 ms when the user takes over).

## Example

```css
/* app.css, after importing @web-agents/core/cursor.css */
:root {
  --agent: #1d4ed8;
  --agent-strong: #1d4ed8;
  --agent-soft: rgba(29, 78, 216, 0.14);
}
```

## Notes

- `:tool-form-active` and `:tool-submit-active` are Chrome's native WebMCP pseudo-classes. The polyfill mirrors them as `data-tool-form-active` / `data-tool-submit-active`. The rules are kept separate because a browser that doesn't know a pseudo-class drops the whole rule.
- Vite 8's Lightning CSS warns that these pseudo-classes are unknown. The rules are kept in the output.
- Under `prefers-reduced-motion: reduce`, transitions shrink to a 0.1 s opacity fade and the halo, ring wait and ring flash animations stop.

## See also

- [`installAgentVisuals`](./install-agent-visuals.md)
- [`UI_HOST_ATTR`](./ui-host-attr.md)
