"use client";

import type { FieldDef } from "../schema";
import { SignaturePad } from "./SignaturePad";
import { PhotoOcrField } from "@/modules/soulevement/components/PhotoOcrField";

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
      // bg-transparent (INPUT_CLASS) laisse le menu déroulant natif retomber sur un fond clair
      // par défaut du navigateur en mode sombre, avec un texte clair hérité par-dessus —
      // illisible. Fond/texte concrets ici (pas "transparent") pour que le popup natif les reprenne.
      return (
        <select
          className={`${INPUT_CLASS} bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text))]`}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text))]">
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
    case "checkbox-group": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-sm transition ${
                  checked
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    : "border-[rgb(var(--border))]"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
                  }
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }
    case "signature":
      return <SignaturePad value={(value as string) || ""} onChange={onChange} />;
    default:
      return (
        <div className="flex items-center gap-2">
          <input
            type={field.type}
            className={INPUT_CLASS}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.photoOcr && <PhotoOcrField onExtracted={onChange} />}
        </div>
      );
  }
}
