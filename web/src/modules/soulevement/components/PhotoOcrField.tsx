"use client";

import { useRef, useState } from "react";

type Props = {
  onExtracted: (numero: string) => void;
};

/** Bouton "Photographier" à côté d'un champ texte : déclenche l'appareil photo sur mobile
 * (`capture="environment"`), envoie l'image à l'IA pour en extraire le numéro, et remplit le
 * champ. Le champ reste toujours corrigible manuellement — pas de blocage si la reconnaissance
 * échoue ou est erronée. */
export function PhotoOcrField({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const imageBase64 = await fileToBase64_(file);
      const res = await fetch("/api/ocr/extract-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data.numero) onExtracted(String(data.numero));
      else setError("Numéro non reconnu — à saisir manuellement");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        title="Photographier pour reconnaître le numéro"
        className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm transition hover:border-brand-500 disabled:opacity-50"
      >
        {loading ? "…" : "📷"}
      </button>
      {error && <p className="mt-1 max-w-[10rem] text-xs text-red-500">{error}</p>}
    </div>
  );
}

function fileToBase64_(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop() || "");
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}
