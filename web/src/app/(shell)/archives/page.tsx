"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { searchArchives, archivesToCsv, downloadCsv, type ArchiveSearchParams } from "@/lib/archives";
import { useToast } from "@/components/ui/Toast";

const STATUT_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "valide", label: "Validé" },
  { value: "archive", label: "Archivé" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "date_creation:desc", label: "Date de création (récent d'abord)" },
  { value: "date_creation:asc", label: "Date de création (ancien d'abord)" },
  { value: "date_validation:desc", label: "Date de validation (récent d'abord)" },
  { value: "numero_dossier:asc", label: "Numéro de dossier" },
];

export default function ArchivesPage() {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [statut, setStatut] = useState("");
  const [sort, setSort] = useState("date_creation:desc");
  const [sortBy, sortDir] = sort.split(":") as [ArchiveSearchParams["sortBy"], ArchiveSearchParams["sortDir"]];

  const { data, isLoading, error } = useQuery({
    queryKey: ["archives", query, statut, sort],
    queryFn: () => searchArchives({ query: query || undefined, statut: statut || undefined, sortBy, sortDir }),
  });

  function handleExport() {
    if (!data?.archives.length) return;
    downloadCsv(`archives-${new Date().toISOString().slice(0, 10)}.csv`, archivesToCsv(data.archives));
    notify("Export CSV téléchargé", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Archives</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Dossiers validés, toutes demandes confondues.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium transition hover:border-brand-500"
          >
            Imprimer
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!data?.archives.length}
            className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium transition hover:border-brand-500 disabled:opacity-50"
          >
            Exporter en CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher par numéro ou utilisateur..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[240px] flex-1 rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {STATUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--bg-elevated))] text-left text-[rgb(var(--text-muted))]">
            <tr>
              <th className="px-4 py-3 font-medium">Numéro</th>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
              <th className="px-4 py-3 font-medium">Validé le</th>
              <th className="px-4 py-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {data?.archives.map((a) => (
              <tr key={a.id} className="border-t border-[rgb(var(--border))]">
                <td className="px-4 py-3">
                  <Link
                    href={`/modules/${a.module}/${a.dossier_id}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-500"
                  >
                    {a.numero_dossier}
                  </Link>
                </td>
                <td className="px-4 py-3">{a.user_display}</td>
                <td className="px-4 py-3">{a.statut}</td>
                <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                  {new Date(a.date_creation).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                  {a.date_validation ? new Date(a.date_validation).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-4 py-3">
                  {a.pdf_url && (
                    <a
                      href={a.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline dark:text-brand-500"
                    >
                      Ouvrir
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {data && data.archives.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                  Aucune archive ne correspond à ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
