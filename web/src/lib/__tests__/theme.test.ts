import { describe, it, expect, beforeEach } from "vitest";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from "../theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("getStoredTheme retourne null si rien n'est stocké", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("applyTheme('dark') ajoute la classe dark et persiste le choix", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(getStoredTheme()).toBe("dark");
  });

  it("applyTheme('light') retire la classe dark", () => {
    applyTheme("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(getStoredTheme()).toBe("light");
  });

  it("ignore une valeur de localStorage non reconnue", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(getStoredTheme()).toBeNull();
  });
});
