"use client";

import { useRef, useState } from "react";

type Props = {
  onFileSelected: (file: { fileBase64: string; fileName: string; mimeType: string }) => void;
};

const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",").pop() || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function UploadZone({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_SIZE_BYTES) {
      setError("Fichier trop volumineux (15 Mo max)");
      return;
    }
    const fileBase64 = await fileToBase64(file);
    setFileName(file.name);
    onFileSelected({ fileBase64, fileName: file.name, mimeType: file.type });
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className="cursor-pointer rounded-2xl border-2 border-dashed border-[rgb(var(--border))] p-10 text-center text-sm text-[rgb(var(--text-muted))] transition hover:border-brand-500"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {fileName ? (
        <p className="font-medium text-[rgb(var(--text))]">{fileName}</p>
      ) : (
        <p>Glissez-déposez un document (PDF, Word, JPG, PNG) ou cliquez pour en choisir un.</p>
      )}
      {error && <p className="mt-2 text-red-500">{error}</p>}
    </div>
  );
}
