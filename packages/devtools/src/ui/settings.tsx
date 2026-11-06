/** Cursor switches (wired to the visuals controller) and the panel layout. */
import { useId } from "react";
import type { DevtoolsSettings, DevtoolsStore } from "../store";
import { useDevtools } from "./use-devtools";

function Switch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange(on: boolean): void;
}) {
  const id = useId();
  return (
    <div className="setting">
      <div>
        <div className="label" id={`${id}-label`}>
          {label}
        </div>
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

/** The Settings tab. `embedded` hides layout options (the host owns the layout). */
export function Settings({ store, embedded, hotkey }: { store: DevtoolsStore; embedded: boolean; hotkey: string | false }) {
  const settings = useDevtools(store, (s) => s.settings);
  const hasVisuals = useDevtools(store, (s) => s.hasVisuals);
  const set =
    <K extends keyof DevtoolsSettings>(key: K) =>
    (value: DevtoolsSettings[K]) =>
      store.setSetting(key, value);
  return (
    <div className="settings">
      {!hasVisuals && (
        <p className="notice">
          No agent cursor to control. Render the devtools inside <code>&lt;WebAgentsProvider&gt;</code>, or pass <code>visuals</code>.
        </p>
      )}
      <Switch
        label="Spotlight"
        hint="Blur and dim the page except the tool the agent is working in."
        checked={settings.spotlight}
        disabled={!hasVisuals}
        onChange={set("spotlight")}
      />
      <Switch
        label="Yield to the user"
        hint="Hide the cursor while you move the mouse, scroll or type. Input in this panel never counts."
        checked={settings.yieldToUser}
        disabled={!hasVisuals}
        onChange={set("yieldToUser")}
      />
      {!embedded && (
        <>
          <div className="setting">
            <div>
              <div className="label">Dock</div>
              <p className="hint">Drag the panel's edge to resize it{hotkey ? `. ${hotkey} opens and closes it.` : "."}</p>
            </div>
            <fieldset className="segmented">
              <legend className="sr-only">Dock</legend>
              {(["bottom", "right"] as const).map((dock) => (
                <button key={dock} type="button" aria-pressed={settings.dock === dock} onClick={() => store.setSetting("dock", dock)}>
                  {dock === "bottom" ? "Bottom" : "Right"}
                </button>
              ))}
            </fieldset>
          </div>
          <div>
            <button type="button" className="btn" onClick={() => store.resetLayout()}>
              Reset layout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
