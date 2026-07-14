export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

// Menu principal — cf. cahier des charges. Les modules métier (ex. "Nouvelle demande")
// seront à terme injectés ici depuis src/modules/registry.ts (cf. ARCHITECTURE.md §3).
export const mainNav: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: "🏠" },
  { label: "Nouvelle demande", href: "/modules/nouvelle-demande", icon: "📄" },
  { label: "Calendrier", href: "/calendrier", icon: "📅" },
  { label: "Archives", href: "/archives", icon: "📂" },
  { label: "Photos", href: "/photos", icon: "📷" },
  { label: "Pièces jointes", href: "/pieces-jointes", icon: "📎" },
  { label: "Formulaires", href: "/formulaires", icon: "📝" },
  { label: "Statistiques", href: "/statistiques", icon: "📊" },
  { label: "Utilisateurs", href: "/utilisateurs", icon: "👥" },
  { label: "Paramètres", href: "/parametres", icon: "⚙️" },
  { label: "Aide", href: "/aide", icon: "❓" },
];
