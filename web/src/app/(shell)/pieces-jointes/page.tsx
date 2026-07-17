"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listAnnexes } from "@/lib/annexes";

export default function PiecesJointesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["annexes", "piece_jointe"],
    queryFn: () => listAnnexes("piece_jointe"),
  });

  const pieces = data?.annexes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pièces jointes</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Tous les fichiers joints, tous dossiers confondus.</p>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--bg-elevated))] text-left text-[rgb(var(--text-muted))]">
            <tr>
              <th className="px-4 py-3 font-medium">Fichier</th>
              <th className="px-4 py-3 font-medium">Dossier</th>
              <th className="px-4 py-3 font-medium">Ajouté le</th>
              <th className="px-4 py-3 font-medium">Télécharger</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p) => (
              <tr key={p.id} className="border-t border-[rgb(var(--border))]">
                <td className="px-4 py-3">{p.nom}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/modules/nouvelle-demande/${p.dossier_id}`}
                    className="text-brand-600 hover:underline dark:text-brand-500"
                  >
                    {p.dossier_numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                  {new Date(p.date_ajout).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={p.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline dark:text-brand-500"
                  >
                    Télécharger
                  </a>
                </td>
              </tr>
            ))}
            {data && pieces.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                  Aucune pièce jointe pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
