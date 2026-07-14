import { StatCard } from "@/components/ui/StatCard";

// Données statiques — remplacées par stats.summary (Apps Script) en Phase 1.
// Cf. ARCHITECTURE.md §6.
const stats = [
  { label: "Dossiers", value: "—", icon: "📁" },
  { label: "En attente", value: "—", icon: "⏳" },
  { label: "Terminés", value: "—", icon: "✅" },
  { label: "Archives", value: "—", icon: "📂" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Vue d&apos;ensemble de votre activité.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-3 text-sm font-medium">Derniers documents</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucun document pour le moment.</p>
        </section>
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-3 text-sm font-medium">Activité récente</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucune activité pour le moment.</p>
        </section>
      </div>
    </div>
  );
}
