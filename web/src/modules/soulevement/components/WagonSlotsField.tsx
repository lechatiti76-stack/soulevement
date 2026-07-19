"use client";

import { useState } from "react";
import { PhotoOcrField } from "./PhotoOcrField";
import { WAGON_SLOTS } from "../schema";

const INPUT_CLASS =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500";

type Props = {
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
};

function computeInitialCount(values: Record<string, unknown>): number {
  let count = 1;
  WAGON_SLOTS.forEach((slot, i) => {
    if (values[slot.conteneurField] || values[slot.wagonField]) count = Math.max(count, i + 1);
  });
  return count;
}

/** De 1 à 4 wagons selon les cas (cf. WAGON_SLOTS) : commence avec 1 seul, "+ Ajouter un wagon"
 * en révèle un de plus jusqu'à 4. "Retirer" ne s'applique qu'au dernier, pour ne pas perdre le
 * sens des positions (Encadrant LH / Soulevé LH / Soulevé PARIS / Encadrant PARIS). */
export function WagonSlotsField({ values, onChange }: Props) {
  const [visibleCount, setVisibleCount] = useState(() => computeInitialCount(values));

  function handleRemoveLast() {
    const slot = WAGON_SLOTS[visibleCount - 1];
    if (!slot) return;
    onChange(slot.conteneurField, "");
    onChange(slot.wagonField, "");
    setVisibleCount((c) => Math.max(1, c - 1));
  }

  return (
    <div className="space-y-4">
      {WAGON_SLOTS.slice(0, visibleCount).map((slot, i) => (
        <div key={slot.key} className="space-y-3 rounded-xl border border-[rgb(var(--border))] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{slot.label}</span>
            {i === visibleCount - 1 && visibleCount > 1 && (
              <button type="button" onClick={handleRemoveLast} className="text-xs text-red-500 hover:underline">
                Retirer
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--text-muted))]">N° Conteneur</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={INPUT_CLASS}
                value={(values[slot.conteneurField] as string) || ""}
                onChange={(e) => onChange(slot.conteneurField, e.target.value)}
              />
              <PhotoOcrField onExtracted={(v) => onChange(slot.conteneurField, v)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[rgb(var(--text-muted))]">N° Wagon</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={INPUT_CLASS}
                value={(values[slot.wagonField] as string) || ""}
                onChange={(e) => onChange(slot.wagonField, e.target.value)}
              />
              <PhotoOcrField onExtracted={(v) => onChange(slot.wagonField, v)} />
            </div>
          </div>
        </div>
      ))}

      {visibleCount < WAGON_SLOTS.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => Math.min(WAGON_SLOTS.length, c + 1))}
          className="w-full rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-2 text-sm text-[rgb(var(--text-muted))] transition hover:border-brand-500 hover:text-brand-600"
        >
          + Ajouter un wagon ({visibleCount}/{WAGON_SLOTS.length})
        </button>
      )}
    </div>
  );
}
