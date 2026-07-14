"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { getDossier } from "@/modules/nouvelle-demande/api";
import { dossierSchema } from "@/modules/nouvelle-demande/schema";

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dossier", params.id],
    queryFn: () => getDossier(params.id),
  });

  if (isLoading) return <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>;
  if (error) return <p className="text-sm text-red-500">{(error as Error).message}</p>;
  if (!data) return null;

  const formData = JSON.parse(data.dossier.form_data || "{}");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dossier {data.dossier.numero}</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Statut : {data.dossier.statut}</p>
      </div>

      {data.dossier.pdf_url && (
        <a
          href={data.dossier.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Ouvrir le PDF
        </a>
      )}

      <div className="space-y-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5">
        {dossierSchema
          .filter((f) => f.type !== "signature")
          .map((field) => (
            <div key={field.name} className="flex justify-between text-sm">
              <span className="text-[rgb(var(--text-muted))]">{field.label}</span>
              <span>{String(formData[field.name] ?? "—")}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
