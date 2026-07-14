"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/modules/nouvelle-demande/components/UploadZone";
import { FormEngine } from "@/modules/nouvelle-demande/components/FormEngine";
import { dossierSchema } from "@/modules/nouvelle-demande/schema";
import { createDossier, saveDossierForm, validateDossier } from "@/modules/nouvelle-demande/api";

type Step = "upload" | "formulaire";

export default function NouvelleDemandeWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: { fileBase64: string; fileName: string; mimeType: string }) {
    setLoading(true);
    setError(null);
    try {
      const { dossier } = await createDossier(file);
      setDossierId(dossier.id);
      setNumero(dossier.numero);
      setStep("formulaire");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      await saveDossierForm(dossierId, values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      await saveDossierForm(dossierId, values);
      await validateDossier(dossierId);
      router.push(`/modules/nouvelle-demande/${dossierId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle demande</h1>

      {numero && <p className="text-sm text-[rgb(var(--text-muted))]">Dossier {numero}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {step === "upload" && <UploadZone onFileSelected={handleUpload} />}

      {step === "formulaire" && (
        <div className="space-y-6">
          <FormEngine
            schema={dossierSchema}
            values={values}
            onChange={(name, value) => setValues((v) => ({ ...v, [name]: value }))}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveDraft}
              className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium transition hover:border-brand-500 disabled:opacity-50"
            >
              Enregistrer le brouillon
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleValidate}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              Valider et générer le PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
