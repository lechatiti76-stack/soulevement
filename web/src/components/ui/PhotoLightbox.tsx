"use client";

import { useEffect } from "react";
import type { Annexe } from "@/lib/annexes";

type Props = {
  photos: Annexe[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export function PhotoLightbox({ photos, index, onClose, onNavigate }: Props) {
  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={onClose}>
      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index - 1 + photos.length) % photos.length);
          }}
          className="absolute left-4 text-3xl text-white/70 transition hover:text-white"
          aria-label="Précédent"
        >
          ‹
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnail_url}
        alt={photo.nom}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index + 1) % photos.length);
          }}
          className="absolute right-4 text-3xl text-white/70 transition hover:text-white"
          aria-label="Suivant"
        >
          ›
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 text-2xl text-white/70 transition hover:text-white"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}
