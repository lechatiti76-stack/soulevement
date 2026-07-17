"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, listUsers, resetUserPassword, updateUser, type Role } from "@/lib/users";
import { useToast } from "@/components/ui/Toast";

const emptyForm = {
  identifiant: "",
  password: "",
  nom: "",
  prenom: "",
  email: "",
  fonction: "",
  role: "utilisateur" as Role,
};

export default function UtilisateursPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser(form);
      notify("Utilisateur créé", "success");
      setForm(emptyForm);
      setShowForm(false);
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActif(id: string, actif: boolean) {
    try {
      await updateUser(id, { actif: !actif });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleRoleChange(id: string, role: Role) {
    try {
      await updateUser(id, { role });
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`Supprimer définitivement ${label} ?`)) return;
    try {
      await deleteUser(id);
      notify("Utilisateur supprimé", "success");
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  async function handleResetPassword(id: string) {
    try {
      const { temporaryPassword } = await resetUserPassword(id);
      setTempPassword(temporaryPassword);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erreur", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-[rgb(var(--text-muted))]">Gestion des comptes et des rôles.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          + Nouvel utilisateur
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-2 gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-5 sm:grid-cols-3"
        >
          <Input label="Prénom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} />
          <Input label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} />
          <Input label="Fonction" value={form.fonction} onChange={(v) => setForm((f) => ({ ...f, fonction: v }))} />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Input
            label="Identifiant"
            value={form.identifiant}
            onChange={(v) => setForm((f) => ({ ...f, identifiant: v }))}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="utilisateur">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="col-span-full">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              Créer
            </button>
          </div>
        </form>
      )}

      {tempPassword && (
        <div className="flex items-center justify-between rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700 dark:bg-amber-950">
          <span>
            Nouveau mot de passe temporaire : <strong className="font-mono">{tempPassword}</strong> — communiquez-le à
            l&apos;utilisateur puis fermez ce message.
          </span>
          <button
            type="button"
            onClick={() => setTempPassword(null)}
            className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
          >
            Fermer
          </button>
        </div>
      )}

      {isLoading && <p className="text-sm text-[rgb(var(--text-muted))]">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{(error as Error).message}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
        <table className="w-full text-sm">
          <thead className="bg-[rgb(var(--bg-elevated))] text-left text-[rgb(var(--text-muted))]">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Identifiant</th>
              <th className="px-4 py-3 font-medium">Fonction</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-[rgb(var(--border))]">
                <td className="px-4 py-3">
                  {u.prenom} {u.nom}
                </td>
                <td className="px-4 py-3">{u.identifiant}</td>
                <td className="px-4 py-3">{u.fonction}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    className="rounded-lg border border-[rgb(var(--border))] bg-transparent px-2 py-1 text-xs"
                  >
                    <option value="utilisateur">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleActif(u.id, u.actif)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.actif
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {u.actif ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u.id)}
                      className="text-brand-600 hover:underline dark:text-brand-500"
                    >
                      Réinitialiser mdp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id, `${u.prenom} ${u.nom}`)}
                      className="text-red-500 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </div>
  );
}
