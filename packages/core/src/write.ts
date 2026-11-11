/**
 * Writing a native form control the way a person's input would, so the page's own listeners (React's included)
 * hear it. Shared by the visuals, which type a value in step with the cursor, and by a tool's call, which writes
 * it in one step when nobody animates.
 */

/** What a native control holds: text, or checked. */
export type FieldValue = string | boolean;
/** A native form control: the only kind of field that is ever written. */
export type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** True for a native control. A custom widget (an element with a `role`) is not one: the cursor visits it, nothing writes it. */
export const isControl = (el: Element): el is FieldControl =>
  el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;

/** True for a checkbox or a radio: their value is `checked`. */
export const isCheckbox = (f: FieldControl): f is HTMLInputElement =>
  f instanceof HTMLInputElement && (f.type === "checkbox" || f.type === "radio");

/**
 * Set `value` on a control and tell the page: the prototype's setter (React tracks the element's own), then `input`
 * and `change`. With `press`, a checkbox or radio is toggled by a click instead, and only when its state differs:
 * React listens to `click` for those, and a radio is only ever turned on.
 */
export function writeControl(f: FieldControl, value: FieldValue, press = false): void {
  if (!isCheckbox(f)) Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), "value")?.set?.call(f, String(value));
  else if (!press) f.checked = !!value;
  else {
    if (f.checked !== (f.type === "radio" || !!value)) f.click();
    return;
  }
  f.dispatchEvent(new Event("input", { bubbles: true }));
  f.dispatchEvent(new Event("change", { bubbles: true }));
}
