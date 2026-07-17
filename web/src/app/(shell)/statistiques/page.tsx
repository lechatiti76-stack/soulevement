"use client";

import { useQuery } from "@tanstack/react-query";
import { getStatsSummary } from "@/lib/stats";
import { BarChart } from "@/components/ui/BarChart";

// Palette catégorielle validée (ordre fixe, jamais cyclé arbitrairement) — cf. skill dataviz.
const CATEGORICAL = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"];
const SEQUENTIAL_BLUE = "#2a78d6";

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  valide: "Validé",
  archive: "Archivé",
};

export default function StatistiquesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: getStatsSummary,
  });

  if (isLoading) return <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>;
  if (error) return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Statistiques</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Vue d&apos;ensemble de l&apos;activité.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Dossiers" value={data.total} />
        <StatTile label="PDF générés" value={data.pdfGeneres} />
        <StatTile
          label="Temps de traitement moyen"
          value={data.tempsTraitementMoyenHeures !== null ? `${data.tempsTraitementMoyenHeures} h` : "—"}
        />
        <StatTile label="Brouillons" value={data.parStatut.brouillon || 0} />
      </div>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <h2 className="mb-4 text-sm font-medium">Dossiers créés par mois (12 derniers mois)</h2>
        <BarChart
          data={data.parMois.map((m) => ({ label: m.label.slice(0, 3), value: m.count }))}
          defaultColor={SEQUENTIAL_BLUE}
        />
      </section>

      {data.parUtilisateur && (
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-4 text-sm font-medium">Dossiers par utilisateur</h2>
          <BarChart
            horizontal
            data={data.parUtilisateur.slice(0, 8).map((u, i) => ({
              label: u.user_display,
              value: u.count,
              color: CATEGORICAL[i % CATEGORICAL.length],
            }))}
            defaultColor={SEQUENTIAL_BLUE}
          />
          {data.parUtilisateur.length > 8 && (
            <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
              + {data.parUtilisateur.length - 8} autre(s) utilisateur(s)
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <h2 className="mb-4 text-sm font-medium">Répartition par statut</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(data.parStatut).map(([statut, count]) => (
            <div key={statut} className="flex items-center gap-2">
              <span className="font-medium">{STATUT_LABELS[statut] || statut}</span>
              <span className="text-[rgb(var(--text-muted))]">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}
