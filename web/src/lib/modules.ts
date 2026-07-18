// Registre des modules métier accessibles depuis le tableau de bord ("Applications").
// Un seul est actif pour l'instant ; les 3 autres suivront le même mécanisme (formulaire +
// template PDF dédié), seuls le contenu du formulaire et le PDF généré changeront.

export type ModuleKey = "soulevement" | "bris-de-barrieres" | "rci" | "autres";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  icon: string;
  active: boolean;
};

export const MODULES: ModuleDef[] = [
  { key: "soulevement", label: "Soulèvement", icon: "🚃", active: true },
  { key: "bris-de-barrieres", label: "Bris de barrières", icon: "🚧", active: false },
  { key: "rci", label: "RCI", icon: "📋", active: false },
  { key: "autres", label: "Autres", icon: "📁", active: false },
];
