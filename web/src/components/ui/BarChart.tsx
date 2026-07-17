"use client";

import { useState } from "react";

type BarDatum = { label: string; value: number; color?: string };

type Props = {
  data: BarDatum[];
  defaultColor: string;
  valueSuffix?: string;
  horizontal?: boolean;
};

const CHART_HEIGHT = 110;

export function BarChart({ data, defaultColor, valueSuffix = "", horizontal = false }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-[rgb(var(--text-muted))]">Pas encore de données.</p>;
  }

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className={`w-28 shrink-0 truncate ${hovered === i ? "text-[rgb(var(--text))]" : "text-[rgb(var(--text-muted))]"}`}
            >
              {d.label}
            </span>
            <div className="relative h-4 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/5">
              <div
                className="h-full rounded transition-[width]"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  backgroundColor: d.color || defaultColor,
                  opacity: hovered === null || hovered === i ? 1 : 0.6,
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums text-[rgb(var(--text-muted))]">
              {d.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5" style={{ height: CHART_HEIGHT + 24 }}>
      {data.map((d, i) => {
        const barHeight = Math.max(4, (d.value / max) * CHART_HEIGHT);
        return (
          <div
            key={d.label}
            className="relative flex flex-1 flex-col items-center justify-end"
            style={{ height: CHART_HEIGHT + 24 }}
          >
            {hovered === i && (
              <div
                className="absolute rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] text-white"
                style={{ bottom: barHeight + 22 }}
              >
                {d.value}
                {valueSuffix}
              </div>
            )}
            <div
              className="w-full cursor-default rounded-t transition-[height]"
              style={{ height: barHeight, backgroundColor: d.color || defaultColor }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
            <span className="mt-1 text-[10px] text-[rgb(var(--text-muted))]">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
