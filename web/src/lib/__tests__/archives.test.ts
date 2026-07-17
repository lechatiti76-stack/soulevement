import { describe, it, expect } from "vitest";
import { archivesToCsv, type ArchiveEntry } from "../archives";

const entry: ArchiveEntry = {
  id: "1",
  numero_dossier: "ND-2026-0001",
  module: "nouvelle-demande",
  dossier_id: "abc",
  user_id: "u1",
  user_display: "Jean Dupont",
  statut: "valide",
  date_creation: "2026-07-15T10:00:00.000Z",
  date_validation: "2026-07-15T11:00:00.000Z",
  pdf_url: "https://drive.google.com/file/d/xyz/view",
};

describe("archivesToCsv", () => {
  it("inclut une ligne d'en-tête et une ligne par archive", () => {
    const csv = archivesToCsv([entry]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Numéro");
  });

  it("échappe les valeurs contenant des virgules ou des guillemets", () => {
    const withComma: ArchiveEntry = { ...entry, user_display: 'Dupont, "Jean"' };
    const csv = archivesToCsv([withComma]);
    expect(csv).toContain('"Dupont, ""Jean"""');
  });

  it("ne retourne que l'en-tête pour une liste vide", () => {
    const csv = archivesToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});
