"use client";

import { useRef } from "react";

type Props = {
  accept: string;
  multiple?: boolean;
  label: string;
  onFilesSelected: (files: { fileBase64: string; fileName: string; mimeType: string }[]) => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",").pop() || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AnnexeUpload({ accept, multiple = true, label, onFilesSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const results = await Promise.all(
      files.map(async (file) => ({
        fileBase64: await fileToBase64(file),
        fileName: file.name,
        mimeType: file.type,
      }))
    );

    onFilesSelected(results);
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium transition hover:border-brand-500"
      >
        {label}
      </button>
    </>
  );
}
