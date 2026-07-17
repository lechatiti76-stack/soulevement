import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { toDateKey, buildMonthGrid } from "../calendar";

describe("toDateKey", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // UTC+12 (hiver austral, pas de DST en juillet) — en avance sur UTC, cas qui aurait
    // révélé le bug corrigé en Phase 5 (bucketing via toISOString au lieu du fuseau local).
    process.env.TZ = "Pacific/Auckland";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("utilise le jour calendaire local, pas le jour UTC (régression Phase 5)", () => {
    // 23:30 UTC le 15 juillet correspond au 16 juillet après minuit en UTC+12.
    const utcLateNight = new Date("2026-07-15T23:30:00.000Z");
    expect(toDateKey(utcLateNight)).toBe("2026-07-16");
  });

  it("formate les composants avec un zéro de tête", () => {
    expect(toDateKey(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });
});

describe("buildMonthGrid", () => {
  it("retourne 42 jours (6 semaines)", () => {
    expect(buildMonthGrid(2026, 6)).toHaveLength(42);
  });

  it("commence un lundi", () => {
    const grid = buildMonthGrid(2026, 6);
    expect(grid[0].getDay()).toBe(1);
  });

  it("couvre bien tous les jours du mois ciblé", () => {
    const grid = buildMonthGrid(2026, 6); // juillet 2026 — 31 jours
    const julyDays = grid.filter((d) => d.getMonth() === 6);
    expect(julyDays).toHaveLength(31);
  });
});
