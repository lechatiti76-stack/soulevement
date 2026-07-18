"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { listDossiers } from "@/modules/soulevement/api";

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  valide: "Validé",
  archive: "Archivé",
};

export default function SoulevementListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dossiers", "soulevement"],
    queryFn: listDossiers,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Soulèvement</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Fiches de soulèvement en cours et validées.</p>
        </div>
        <Link
          href="/modules/soulevement/nouveau"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + Nouvelle fiche
        </Link>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      <div className="space-y-2">
        {data?.dossiers.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Link
              href={`/modules/soulevement/${d.id}`}
              className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3 text-sm transition hover:border-brand-500"
            >
              <span className="font-medium">{d.numero}</span>
              <span className="text-[rgb(var(--text-muted))]">{STATUT_LABELS[d.statut] || d.statut}</span>
            </Link>
          </motion.div>
        ))}
        {data && data.dossiers.length === 0 && (
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucune fiche pour le moment.</p>
        )}
      </div>
    </div>
  );
}
