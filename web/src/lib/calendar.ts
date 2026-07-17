// Logique de calendrier pure et testable — utilisée par app/(shell)/calendrier/page.tsx.
// Extraite de la page pour permettre des tests unitaires (cf. bug corrigé en Phase 5 :
// le bucketing par date doit utiliser le fuseau local, pas UTC).

/** Clé locale (pas UTC) pour que le regroupement par jour corresponde au fuseau de l'utilisateur. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Grille de 42 jours (6 semaines, lundi en premier) couvrant le mois donné. */
export function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // dimanche=0 → décalage lundi-first
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
