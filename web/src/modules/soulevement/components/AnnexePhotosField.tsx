"use client";

import type { Annexe } from "@/lib/annexes";
import { AnnexeUpload } from "@/modules/nouvelle-demande/components/AnnexeUpload";

type Props = {
  photos: Annexe[];
  onUpload: (files: { fileBase64: string; fileName: string; mimeType: string }[]) => void;
  onDelete: (annexeId: string) => void;
  uploading?: boolean;
};

/** Miniatures dans le formulaire ; les photos sont ajoutées en taille réelle, une par page,
 * à la fin du PDF généré (cf. buildAndExportSoulevementPdf_ côté Apps Script). */
export function AnnexePhotosField({ photos, onUpload, onDelete, uploading }: Props) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium">Photos annexes</label>
        <AnnexeUpload
          accept="image/*"
          label={uploading ? "Envoi..." : "+ Ajouter des photos"}
          onFilesSelected={onUpload}
        />
      </div>
      <p className="mb-2 text-xs text-[rgb(var(--text-muted))]">
        Ajoutées en taille réelle, en pages supplémentaires, à la fin du PDF.
      </p>

      {photos.length === 0 ? (
        <p className="text-sm text-[rgb(var(--text-muted))]">Aucune photo pour le moment.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[rgb(var(--border))]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnail_url}
                alt={p.nom}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="absolute right-1 top-1 hidden rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
                aria-label="Supprimer la photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
