"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { addAnnexe, addComment, deleteAnnexe, getDossier } from "@/modules/soulevement/api";
import { AnnexeUpload } from "@/modules/nouvelle-demande/components/AnnexeUpload";
import {
  soulevementFieldsForPart,
  SOULEVEMENT_PART_LABELS,
  type SoulevementPart,
} from "@/modules/soulevement/schema";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { useToast } from "@/components/ui/Toast";

const ACTION_LABELS: Record<string, string> = {
  creation: "Dossier créé",
  modification_formulaire: "Formulaire modifié",
  validation: "Dossier validé",
  commentaire: "Commentaire ajouté",
  ajout_photo: "Photo ajoutée",
  ajout_piece_jointe: "Pièce jointe ajoutée",
  suppression_annexe: "Annexe supprimée",
};

const PARTS: SoulevementPart[] = [1, 2, 3];

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

export default function SoulevementDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dossier", params.id],
    queryFn: () => getDossier(params.id),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["dossier", params.id] });
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await addComment(params.id, comment.trim());
      setComment("");
      notify("Commentaire ajouté", "success");
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddFiles(
    type: "photo" | "piece_jointe",
    files: { fileBase64: string; fileName: string; mimeType: string }[]
  ) {
    try {
      for (const file of files) {
        await addAnnexe(params.id, type, file);
      }
      notify(type === "photo" ? "Photo ajoutée" : "Pièce jointe ajoutée", "success");
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleDeleteAnnexe(annexeId: string) {
    try {
      await deleteAnnexe(params.id, annexeId);
      notify("Annexe supprimée", "success");
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  if (isLoading) return <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>;
  if (error) return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  if (!data) return null;

  const formData = JSON.parse(data.dossier.form_data || "{}");
  const photos = data.annexes.filter((a) => a.type === "photo");
  const pieces = data.annexes.filter((a) => a.type === "piece_jointe");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Soulèvement — {data.dossier.numero}</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Statut : {data.dossier.statut}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium transition hover:border-brand-500 print:hidden"
        >
          Imprimer
        </button>
      </div>

      {data.dossier.pdf_url && (
        <a
          href={data.dossier.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 print:hidden"
        >
          Ouvrir le PDF
        </a>
      )}

      {PARTS.map((part) => (
        <div key={part} className="space-y-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
          <h2 className="mb-1 text-sm font-medium">
            {part}. {SOULEVEMENT_PART_LABELS[part]}
          </h2>
          {soulevementFieldsForPart(part)
            .filter((f) => f.type !== "signature")
            .map((field) => (
              <div key={field.name} className="flex justify-between gap-4 text-sm">
                <span className="text-[rgb(var(--text-muted))]">{field.label}</span>
                <span className="text-right">{formatValue(formData[field.name])}</span>
              </div>
            ))}
        </div>
      ))}

      <section className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Photos</h2>
          <AnnexeUpload
            accept="image/*"
            label="+ Ajouter des photos"
            onFilesSelected={(files) => handleAddFiles("photo", files)}
          />
        </div>

        {photos.length === 0 ? (
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucune photo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[rgb(var(--border))]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnail_url}
                  alt={p.nom}
                  onClick={() => setLightboxIndex(i)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  className="h-full w-full cursor-pointer object-cover transition group-hover:opacity-80"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteAnnexe(p.id)}
                  className="absolute right-1 top-1 hidden rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
                  aria-label="Supprimer la photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <section className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Pièces jointes</h2>
          <AnnexeUpload
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.xlsx"
            label="+ Ajouter un fichier"
            onFilesSelected={(files) => handleAddFiles("piece_jointe", files)}
          />
        </div>

        {pieces.length === 0 ? (
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucune pièce jointe pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {pieces.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.nom}</span>
                <span className="flex items-center gap-3">
                  <a
                    href={p.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:underline dark:text-brand-500"
                  >
                    Télécharger
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnexe(p.id)}
                    className="text-[rgb(var(--text-muted))] hover:text-red-500"
                  >
                    Supprimer
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <h2 className="text-sm font-medium">Commentaires</h2>

        {data.commentaires.length === 0 && (
          <p className="text-sm text-[rgb(var(--text-muted))]">Aucun commentaire pour le moment.</p>
        )}
        <div className="space-y-3">
          {data.commentaires.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{c.user_display}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">
                  {new Date(c.date).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="text-[rgb(var(--text-muted))]">{c.texte}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ajouter un commentaire..."
            className="flex-1 rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={submitting || !comment.trim()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Envoyer
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        <h2 className="text-sm font-medium">Historique</h2>
        <ol className="space-y-2 border-l border-[rgb(var(--border))] pl-4">
          {data.historique.map((h) => (
            <li key={h.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{ACTION_LABELS[h.action] || h.action}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">
                  {new Date(h.date).toLocaleString("fr-FR")}
                </span>
              </div>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                {h.user_display}
                {h.detail ? ` — ${h.detail}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
