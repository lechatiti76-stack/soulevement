const SECTIONS = [
  {
    title: "Créer une demande",
    text: "Depuis « Nouvelle demande », déposez un document (PDF, Word ou image). L'IA tente de pré-remplir le formulaire automatiquement — relisez et corrigez les champs avant de valider.",
  },
  {
    title: "Valider un dossier",
    text: "Une fois le formulaire complété, cliquez sur « Valider et générer le PDF ». Le dossier passe au statut Validé, un PDF est généré et archivé automatiquement.",
  },
  {
    title: "Photos et pièces jointes",
    text: "Chaque dossier peut recevoir des photos (galerie avec zoom) et des pièces jointes (téléchargeables), ajoutées ou supprimées depuis la page du dossier.",
  },
  {
    title: "Archives",
    text: "La page Archives regroupe tous les dossiers validés : recherche par numéro ou utilisateur, filtre par statut, tri, export CSV.",
  },
  {
    title: "Calendrier et statistiques",
    text: "Le Calendrier situe vos dossiers par date de création (vues Mois et Agenda). La page Statistiques résume l'activité (dossiers par mois, par utilisateur, temps de traitement moyen).",
  },
  {
    title: "Rôles",
    text: "Un utilisateur ne voit et ne modifie que ses propres dossiers. Un administrateur voit tout et gère les comptes utilisateurs et les paramètres de l'application.",
  },
];

export default function AidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aide</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Comment utiliser Soulèvement.</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5"
          >
            <h2 className="mb-1 text-sm font-medium">{s.title}</h2>
            <p className="text-sm text-[rgb(var(--text-muted))]">{s.text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
