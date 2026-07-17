export type MonthlyBucket = { key: string; label: string; count: number };

export type UserStat = { user_id: string; user_display: string; count: number };

export type StatsSummary = {
  total: number;
  parStatut: Record<string, number>;
  parMois: MonthlyBucket[];
  parUtilisateur: UserStat[] | null;
  pdfGeneres: number;
  tempsTraitementMoyenHeures: number | null;
};

export async function getStatsSummary(): Promise<StatsSummary> {
  const res = await fetch("/api/stats");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data;
}
