"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Échec de la connexion");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Soulèvement</h1>
        <p className="mb-6 text-sm text-[rgb(var(--text-muted))]">
          Connectez-vous pour accéder à votre espace.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="identifiant" className="mb-1 block text-sm font-medium">
              Identifiant
            </label>
            <input
              id="identifiant"
              name="identifiant"
              type="text"
              autoComplete="username"
              required
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
