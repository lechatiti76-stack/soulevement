// Registre des modules métier accessibles depuis le tableau de bord ("Applications").
// Deux actifs pour l'instant (Soulèvement, Bris de barrières) ; les 2 autres suivront le même
// mécanisme (formulaire + template PDF dédié), seuls le contenu du formulaire et le PDF changent.

export type ModuleKey = "soulevement" | "bris-barrieres" | "rci" | "autres";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  icon: string;
  active: boolean;
};

export const MODULES: ModuleDef[] = [
  { key: "soulevement", label: "Soulèvement", icon: "🚃", active: true },
  { key: "bris-barrieres", label: "Bris de barrières", icon: "🚧", active: true },
  { key: "rci", label: "RCI", icon: "📋", active: false },
  { key: "autres", label: "Autres", icon: "📁", active: false },
];
