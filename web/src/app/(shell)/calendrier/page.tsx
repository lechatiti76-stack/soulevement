"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listDossiers } from "@/modules/nouvelle-demande/api";
import type { Dossier } from "@/modules/nouvelle-demande/types";
import { buildMonthGrid, toDateKey } from "@/lib/calendar";

const STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-gray-400",
  en_attente: "bg-amber-500",
  valide: "bg-emerald-500",
  archive: "bg-blue-500",
};

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  valide: "Validé",
  archive: "Archivé",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendrierPage() {
  const [view, setView] = useState<"mois" | "agenda">("mois");
  const [cursor, setCursor] = useState(() => new Date());

  const { data, isLoading, error } = useQuery({
    queryKey: ["dossiers"],
    queryFn: listDossiers,
  });

  const dossiers = useMemo(() => data?.dossiers ?? [], [data]);

  const byDate = useMemo(() => {
    const map = new Map<string, Dossier[]>();
    dossiers.forEach((d) => {
      if (!d.date_creation) return;
      const key = toDateKey(new Date(d.date_creation));
      const list = map.get(key) || [];
      list.push(d);
      map.set(key, list);
    });
    return map;
  }, [dossiers]);

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  function changeMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  const sortedAgenda = useMemo(
    () => [...dossiers].sort((a, b) => b.date_creation.localeCompare(a.date_creation)),
    [dossiers]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendrier</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Dossiers par date de création.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("mois")}
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              view === "mois" ? "border-brand-500 text-brand-600 dark:text-brand-500" : "border-[rgb(var(--border))]"
            }`}
          >
            Mois
          </button>
          <button
            type="button"
            onClick={() => setView("agenda")}
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              view === "agenda" ? "border-brand-500 text-brand-600 dark:text-brand-500" : "border-[rgb(var(--border))]"
            }`}
          >
            Agenda
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      {view === "mois" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-[rgb(var(--bg-elevated))]"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-[rgb(var(--bg-elevated))]"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[rgb(var(--text-muted))]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const key = toDateKey(d);
              const entries = byDate.get(key) || [];
              return (
                <div
                  key={key}
                  className={`min-h-[80px] rounded-xl border border-[rgb(var(--border))] p-1.5 text-xs ${
                    inMonth ? "bg-[rgb(var(--bg-elevated))]" : "opacity-40"
                  }`}
                >
                  <div className="mb-1 text-[rgb(var(--text-muted))]">{d.getDate()}</div>
                  <div className="space-y-0.5">
                    {entries.slice(0, 3).map((dossier) => (
                      <Link
                        key={dossier.id}
                        href={`/modules/nouvelle-demande/${dossier.id}`}
                        className="flex items-center gap-1 truncate rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUT_COLORS[dossier.statut] || "bg-gray-400"}`}
                        />
                        <span className="truncate">{dossier.numero}</span>
                      </Link>
                    ))}
                    {entries.length > 3 && <div className="text-[rgb(var(--text-muted))]">+{entries.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "agenda" && (
        <div className="space-y-2">
          {sortedAgenda.map((d) => (
            <Link
              key={d.id}
              href={`/modules/nouvelle-demande/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3 text-sm transition hover:border-brand-500"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${STATUT_COLORS[d.statut] || "bg-gray-400"}`} />
                <span className="font-medium">{d.numero}</span>
              </div>
              <div className="flex items-center gap-4 text-[rgb(var(--text-muted))]">
                <span>{STATUT_LABELS[d.statut] || d.statut}</span>
                <span>{new Date(d.date_creation).toLocaleDateString("fr-FR")}</span>
              </div>
            </Link>
          ))}
          {data && sortedAgenda.length === 0 && (
            <p className="text-sm text-[rgb(var(--text-muted))]">Aucun dossier pour le moment.</p>
          )}
        </div>
      )}
    </div>
  );
}
