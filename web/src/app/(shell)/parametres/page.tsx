"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/settings";
import { useToast } from "@/components/ui/Toast";

export default function ParametresPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [nomApp, setNomApp] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  useEffect(() => {
    if (data) {
      setNomApp(data.nom_app);
      setLogoUrl(data.logo_url);
    }
  }, [data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateSettings({ nom_app: nomApp, logo_url: logoUrl });
      notify("Paramètres enregistrés", "success");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>;
  if (error) return <p className="text-sm text-red-500">{(error as Error).message}</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Identité visuelle de l&apos;application.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">Nom de l&apos;application</label>
          <input
            type="text"
            value={nomApp}
            onChange={(e) => setNomApp(e.target.value)}
            placeholder="Soulèvement"
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">URL du logo</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
            Lien direct vers une image (affiché dans la barre latérale). Laisser vide pour aucun logo.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
