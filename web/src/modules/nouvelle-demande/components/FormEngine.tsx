"use client";

import type { FieldDef } from "../schema";
import { SignaturePad } from "./SignaturePad";

type Props = {
  schema: FieldDef[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500";

export function FormEngine({ schema, values, onChange }: Props) {
  return (
    <div className="space-y-5">
      {schema.map((field) => (
        <div key={field.name}>
          <label className="mb-1 block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>
          <FieldControl field={field} value={values[field.name]} onChange={(v) => onChange(field.name, v)} />
        </div>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          rows={3}
          className={INPUT_CLASS}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "select":
      return (
        <select className={INPUT_CLASS} value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex gap-4">
          {field.options?.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          Oui
        </label>
      );
    case "signature":
      return <SignaturePad value={(value as string) || ""} onChange={onChange} />;
    default:
      return (
        <input
          type={field.type}
          className={INPUT_CLASS}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
