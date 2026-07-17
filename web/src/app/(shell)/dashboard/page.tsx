"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/StatCard";
import { getStatsSummary } from "@/lib/stats";
import { listDossiers } from "@/modules/nouvelle-demande/api";

export default function DashboardPage() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStatsSummary });
  const { data: dossiersData } = useQuery({ queryKey: ["dossiers"], queryFn: listDossiers });

  const recents = [...(dossiersData?.dossiers ?? [])]
    .sort((a, b) => b.date_creation.localeCompare(a.date_creation))
    .slice(0, 5);

  const cards = [
    { label: "Dossiers", value: stats ? stats.total : "—", icon: "📁" },
    { label: "Brouillons", value: stats ? stats.parStatut.brouillon || 0 : "—", icon: "⏳" },
    { label: "Validés", value: stats ? stats.parStatut.valide || 0 : "—", icon: "✅" },
    { label: "PDF générés", value: stats ? stats.pdfGeneres : "—", icon: "📂" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Vue d&apos;ensemble de votre activité.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-3 text-sm font-medium">Derniers documents</h2>
          {recents.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-muted))]">Aucun document pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {recents.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/modules/nouvelle-demande/${d.id}`}
                    className="flex items-center justify-between text-sm hover:text-brand-600 dark:hover:text-brand-500"
                  >
                    <span>{d.numero}</span>
                    <span className="text-[rgb(var(--text-muted))]">
                      {new Date(d.date_creation).toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-3 text-sm font-medium">Activité récente</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Voir l&apos;historique détaillé sur chaque dossier — flux global à venir.
          </p>
        </section>
      </div>
    </div>
  );
}
