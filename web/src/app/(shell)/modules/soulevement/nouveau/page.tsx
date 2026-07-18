"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormEngine } from "@/modules/nouvelle-demande/components/FormEngine";
import {
  soulevementFieldsForPart,
  SOULEVEMENT_PART_LABELS,
  type SoulevementPart,
} from "@/modules/soulevement/schema";
import { createDossier, saveDossierForm, validateDossier } from "@/modules/soulevement/api";
import { useToast } from "@/components/ui/Toast";

const PARTS: SoulevementPart[] = [1, 2, 3];

export default function SoulevementWizardPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [part, setPart] = useState<SoulevementPart>(1);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [preparing, setPreparing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createDossier()
      .then(({ dossier }) => {
        setDossierId(dossier.id);
        setNumero(dossier.numero);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setPreparing(false));
  }, []);

  async function handleNext() {
    if (!dossierId) return;
    setError(null);
    setSubmitting(true);
    try {
      await saveDossierForm(dossierId, values);
      setPart((p) => (p < 3 ? ((p + 1) as SoulevementPart) : p));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrevious() {
    setPart((p) => (p > 1 ? ((p - 1) as SoulevementPart) : p));
  }

  async function handleValidate() {
    if (!dossierId) return;
    setError(null);
    setSubmitting(true);
    try {
      await saveDossierForm(dossierId, values);
      await validateDossier(dossierId);
      notify("Fiche validée — PDF généré", "success");
      router.push(`/modules/soulevement/${dossierId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (preparing) {
    return <p className="text-sm text-[rgb(var(--text-muted))]">Préparation de la fiche...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Soulèvement</h1>
        {numero && <p className="text-sm text-[rgb(var(--text-muted))]">Dossier {numero}</p>}
      </div>

      <div className="flex items-center gap-2">
        {PARTS.map((p) => (
          <div
            key={p}
            className={`flex-1 rounded-full px-2 py-1.5 text-center text-xs font-medium ${
              p === part
                ? "bg-brand-600 text-white"
                : p < part
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
            }`}
          >
            {p}. {SOULEVEMENT_PART_LABELS[p]}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <FormEngine
        schema={soulevementFieldsForPart(part)}
        values={values}
        onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
      />

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={part === 1 || submitting}
          className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium transition hover:border-brand-500 disabled:opacity-50"
        >
          Précédent
        </button>
        {part < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            onClick={handleValidate}
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            Valider et générer le PDF
          </button>
        )}
      </div>
    </div>
  );
}
