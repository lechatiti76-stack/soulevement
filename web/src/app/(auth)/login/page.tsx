export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Soulèvement</h1>
        <p className="mb-6 text-sm text-[rgb(var(--text-muted))]">
          Connectez-vous pour accéder à votre espace.
        </p>

        {/* Formulaire non connecté à l'API — branché en Phase 1 (cf. ARCHITECTURE.md §2, §6) */}
        <form className="space-y-4">
          <div>
            <label htmlFor="identifiant" className="mb-1 block text-sm font-medium">
              Identifiant
            </label>
            <input
              id="identifiant"
              name="identifiant"
              type="text"
              autoComplete="username"
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
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
