/**
 * A controlled form for a tool's JSON Schema: string, enum, date, number,
 * integer, boolean, nested object and array. Anything else (`oneOf`, `$ref`,
 * no type) gets a raw-JSON field for that subtree. No validation: the tool
 * validates, and its error comes back in the result.
 */
import { type ChangeEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { type SchemaNode, typeOf } from "../schema";
import { coerce } from "./coerce";
import { defaultValueFor } from "./defaults";

/** Props of `SchemaForm`. */
export interface SchemaFormProps {
  schema: SchemaNode;
  value: unknown;
  onChange(value: unknown): void;
  /** Prefix for element ids, unique per form on the page. */
  idPrefix: string;
}

interface FieldProps {
  schema: SchemaNode;
  value: unknown;
  onChange(value: unknown): void;
  id: string;
  label: string;
  required?: boolean;
}

const UNSUPPORTED = ["oneOf", "anyOf", "allOf", "$ref", "not"];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** The whole form. A top-level object renders its fields directly, without a fieldset. */
export function SchemaForm({ schema, value, onChange, idPrefix }: SchemaFormProps) {
  if (typeOf(schema) === "object" && schema.properties && !UNSUPPORTED.some((k) => k in schema)) {
    if (Object.keys(schema.properties).length === 0) return <p className="hint">This tool takes no arguments.</p>;
    return <ObjectFields schema={schema} value={value} onChange={onChange} id={idPrefix} />;
  }
  return <Field schema={schema} value={value} onChange={onChange} id={idPrefix} label="Arguments" />;
}

function ObjectFields({ schema, value, onChange, id }: Omit<FieldProps, "label">) {
  const obj = isRecord(value) ? value : {};
  const required = new Set(schema.required ?? []);
  return (
    <div className="form">
      {Object.entries(schema.properties ?? {}).map(([key, prop]) => (
        <Field
          key={key}
          schema={prop}
          value={obj[key]}
          id={`${id}-${key}`}
          label={prop.title ?? key}
          required={required.has(key)}
          onChange={(next) => {
            const copy = { ...obj };
            if (next === undefined) delete copy[key];
            else copy[key] = next;
            onChange(copy);
          }}
        />
      ))}
    </div>
  );
}

function Label({ id, label, required, type }: { id: string; label: string; required?: boolean; type?: string }) {
  return (
    <label htmlFor={id}>
      <span className="mono">{label}</span>
      {required && (
        <span className="req" aria-hidden="true">
          *
        </span>
      )}
      {type && <span className="type">{type}</span>}
    </label>
  );
}

function Hint({ id, schema }: { id: string; schema: SchemaNode }) {
  return schema.description ? (
    <p id={id} className="hint">
      {schema.description}
    </p>
  ) : null;
}

function Field(props: FieldProps) {
  const { schema, value, onChange, id, label, required } = props;
  const type = typeOf(schema);
  const hintId = `${id}-hint`;
  const describedBy = schema.description ? hintId : undefined;

  if (!type || UNSUPPORTED.some((k) => k in schema)) return <JsonField {...props} />;

  if (type === "object") {
    return (
      <fieldset aria-describedby={describedBy}>
        <legend className="mono">{label}</legend>
        <Hint id={hintId} schema={schema} />
        <ObjectFields schema={schema} value={value} onChange={onChange} id={id} />
      </fieldset>
    );
  }
  if (type === "array") return <ArrayField {...props} />;

  if (type === "boolean") {
    return (
      <div className="field">
        <label className="check">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
          <span className="mono">{label}</span>
        </label>
        <Hint id={hintId} schema={schema} />
      </div>
    );
  }

  const common = {
    id,
    className: "input",
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  };
  let control: ReactNode;
  if (type === "integer" || type === "number") {
    control = (
      <NumberInput
        {...common}
        value={value}
        step={type === "integer" ? 1 : "any"}
        min={schema.minimum}
        max={schema.maximum}
        onValue={(raw) => onChange(coerce(schema, raw))}
      />
    );
  } else if (Array.isArray(schema.enum)) {
    control = (
      // Index 0 is "not set": what the select shows is always what gets sent.
      <select {...common} value={String(value ?? "")} onChange={(e) => onChange(schema.enum?.[e.currentTarget.selectedIndex - 1])}>
        <option value="">(not set)</option>
        {schema.enum.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    );
  } else {
    const text = typeof value === "string" ? value : value === undefined ? "" : JSON.stringify(value);
    const onText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(coerce(schema, e.currentTarget.value));
    const multiline = (schema.maxLength ?? 0) > 120 || /multi-?line/i.test(schema.description ?? "");
    control = multiline ? (
      <textarea {...common} value={text} onChange={onText} />
    ) : (
      <input {...common} type={schema.format === "date" ? "date" : "text"} value={text} spellCheck={false} onChange={onText} />
    );
  }
  return (
    <div className="field">
      <Label id={id} label={label} required={required} type={type} />
      {control}
      <Hint id={hintId} schema={schema} />
    </div>
  );
}

/** Keeps the typed text (`1.`, `-`) while the parent holds the number. */
function NumberInput({
  value,
  onValue,
  ...rest
}: { value: unknown; onValue(raw: string): void; step: number | "any"; min?: number; max?: number } & Record<string, unknown>) {
  const external = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  const [text, setText] = useState(external);
  // Follow outside changes (Form ⇄ JSON, re-run prefill), but not our own keystrokes. Our keystrokes
  // always yield the same number (or "" for an empty field), so a mismatch came from outside.
  const outside =
    external === "" ? text.trim() !== "" && !Number.isNaN(Number(text)) : Number(text) !== Number(external) && text !== external;
  if (outside) setText(external);
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.currentTarget.value);
        onValue(e.currentTarget.value);
      }}
    />
  );
}

function ArrayField({ schema, value, onChange, id, label, required }: FieldProps) {
  const items = Array.isArray(value) ? value : [];
  const itemSchema = schema.items ?? {};
  const list = useRef<HTMLDivElement>(null);
  const focusIndex = useRef<number | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (focusIndex.current === null) return;
    // The new row's first control, so keyboard users land where they can type.
    list.current?.querySelector<HTMLElement>(`[data-item="${focusIndex.current}"] :is(input, select, textarea)`)?.focus();
    focusIndex.current = null;
  });

  return (
    <fieldset aria-describedby={schema.description ? `${id}-hint` : undefined}>
      <legend id={headingId} className="mono">
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </legend>
      <Hint id={`${id}-hint`} schema={schema} />
      <div className="items" ref={list}>
        {items.length === 0 && <p className="hint">No items.</p>}
        {items.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their position
          <div className="item" data-item={i} key={i}>
            <Field
              schema={itemSchema}
              value={item}
              id={`${id}-${i}`}
              label={`${label} ${i + 1}`}
              onChange={(next) => onChange(items.map((old, j) => (j === i ? next : old)))}
            />
            <button type="button" className="btn ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              Remove<span className="sr-only"> item {i + 1}</span>
            </button>
          </div>
        ))}
      </div>
      <div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            focusIndex.current = items.length;
            onChange([...items, defaultValueFor(itemSchema)]);
          }}
        >
          Add item
        </button>
      </div>
    </fieldset>
  );
}

/** Raw JSON for a subtree the form can't render. Keeps the last valid value while the text doesn't parse. */
function JsonField({ value, onChange, id, label, required, schema }: FieldProps) {
  const [text, setText] = useState(() => (value === undefined ? "" : JSON.stringify(value, null, 2)));
  const [error, setError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="field">
      <Label id={id} label={label} required={required} type="json" />
      <textarea
        id={id}
        className="input"
        value={text}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? errorId : "", schema.description ? hintId : ""].filter(Boolean).join(" ") || undefined}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setText(next);
          if (next.trim() === "") {
            setError(null);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(next));
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {error && (
        <p id={errorId} className="error-text">
          Not valid JSON: {error}
        </p>
      )}
      <Hint id={hintId} schema={schema} />
    </div>
  );
}
