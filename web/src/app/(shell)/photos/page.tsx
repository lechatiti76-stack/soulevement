"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listAnnexes } from "@/lib/annexes";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";

export default function PhotosPage() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["annexes", "photo"],
    queryFn: () => listAnnexes("photo"),
  });

  const photos = data?.annexes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Photos</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Toutes les photos, tous dossiers confondus.</p>
      </div>

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}
      {data && photos.length === 0 && (
        <p className="text-sm text-[rgb(var(--text-muted))]">Aucune photo pour le moment.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p, i) => (
          <div key={p.id} className="space-y-1">
            <div className="aspect-square overflow-hidden rounded-xl border border-[rgb(var(--border))]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbnail_url}
                alt={p.nom}
                onClick={() => setLightboxIndex(i)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                className="h-full w-full cursor-pointer object-cover transition hover:opacity-80"
              />
            </div>
            <Link
              href={`/modules/nouvelle-demande/${p.dossier_id}`}
              className="block truncate text-xs text-[rgb(var(--text-muted))] hover:text-brand-600 dark:hover:text-brand-500"
            >
              {p.dossier_numero}
            </Link>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
