"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/modules/nouvelle-demande/components/UploadZone";
import { FormEngine } from "@/modules/nouvelle-demande/components/FormEngine";
import { dossierSchema } from "@/modules/nouvelle-demande/schema";
import {
  createDossier,
  extractDossierIA,
  saveDossierForm,
  validateDossier,
} from "@/modules/nouvelle-demande/api";
import { useToast } from "@/components/ui/Toast";

type Step = "upload" | "formulaire";

export default function NouvelleDemandeWizardPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [dossierId, setDossierId] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [iaNotice, setIaNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: { fileBase64: string; fileName: string; mimeType: string }) {
    setLoading(true);
    setError(null);
    try {
      const { dossier } = await createDossier(file);
      setDossierId(dossier.id);
      setNumero(dossier.numero);
      setStep("formulaire");
      runExtraction(dossier.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function runExtraction(id: string) {
    setExtracting(true);
    setIaNotice(null);
    try {
      const result = await extractDossierIA(id);
      setValues((v) => ({ ...v, ...result.champsExtraits }));
      setIaNotice("Champs pré-remplis par l'IA — vérifiez et corrigez si nécessaire avant de valider.");
    } catch {
      setIaNotice("Extraction automatique indisponible pour ce document — remplissez le formulaire manuellement.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSaveDraft() {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    try {
      await saveDossierForm(dossierId, values);
      notify("Brouillon enregistré", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      notify(message, "error");
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
      notify("Dossier validé — PDF généré", "success");
      router.push(`/modules/nouvelle-demande/${dossierId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      notify(message, "error");
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
          {extracting && (
            <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3 text-sm text-[rgb(var(--text-muted))]">
              Analyse du document en cours...
            </p>
          )}
          {!extracting && iaNotice && (
            <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3 text-sm text-[rgb(var(--text-muted))]">
              {iaNotice}
            </p>
          )}

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
