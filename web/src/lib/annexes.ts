// Photos et pièces jointes, transverses aux dossiers (cf. ARCHITECTURE.md §4).

export type AnnexeType = "photo" | "piece_jointe";

export type Annexe = {
  id: string;
  dossier_id: string;
  type: AnnexeType;
  drive_file_id: string;
  nom: string;
  date_ajout: string;
  thumbnail_url: string;
  view_url: string;
  download_url: string;
};

export type AnnexeWithDossier = Annexe & { dossier_numero: string };

export async function listAnnexes(type?: AnnexeType): Promise<{ annexes: AnnexeWithDossier[] }> {
  const qs = type ? `?type=${type}` : "";
  const res = await fetch(`/api/annexes${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}
