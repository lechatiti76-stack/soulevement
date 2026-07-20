"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { listDossiers, deleteDossier } from "@/modules/bris-barrieres/api";
import { useToast } from "@/components/ui/Toast";

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  valide: "Validé",
  archive: "Archivé",
};

export default function BrisBarrieresListPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dossiers", "bris-barrieres"],
    queryFn: listDossiers,
  });

  async function handleDelete(e: React.MouseEvent, id: string, numero: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Supprimer définitivement le dossier ${numero} ? Cette action est irréversible.`)) return;

    try {
      await deleteDossier(id);
      notify("Dossier supprimé", "success");
      queryClient.invalidateQueries({ queryKey: ["dossiers", "bris-barrieres"] });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bris de barrières</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Accidents (barrières, collisions, événements).</p>
        </div>
        <Link
          href="/modules/bris-barrieres/nouveau"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + Nouveau dossier
        </Link>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      <div className="space-y-2">
        {data?.dossiers.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link
              href={`/modules/bris-barrieres/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3 text-sm transition hover:border-brand-500"
            >
              <span className="font-medium">{d.numero}</span>
              <span className="flex items-center gap-3">
                <span className="text-[rgb(var(--text-muted))]">{STATUT_LABELS[d.statut] || d.statut}</span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, d.id, d.numero)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              </span>
            </Link>
          </motion.div>
        ))}
        {data && data.dossiers.length === 0 && (
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucun dossier pour le moment.</p>
        )}
      </div>
    </div>
  );
}
