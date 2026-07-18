// Gestion des utilisateurs — réservée aux administrateurs (cf. ARCHITECTURE.md §6, §9).

export type Role = "admin" | "utilisateur";

export type ManagedUser = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  identifiant: string;
  photo_url: string;
  fonction: string;
  role: Role;
  actif: boolean;
  date_creation: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur inattendue");
  return data as T;
}

export function listUsers() {
  return request<{ users: ManagedUser[] }>("/api/users");
}

export function createUser(input: {
  identifiant: string;
  password: string;
  nom: string;
  prenom: string;
  email: string;
  fonction: string;
  role: Role;
}) {
  return request<{ users: ManagedUser[] }>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUser(
  id: string,
  patch: Partial<Pick<ManagedUser, "nom" | "prenom" | "email" | "fonction" | "role" | "actif" | "identifiant">>
) {
  return request<{ users: ManagedUser[] }>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteUser(id: string) {
  return request<{ users: ManagedUser[] }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

export function resetUserPassword(id: string, newPassword?: string) {
  return request<{ temporaryPassword: string }>(`/api/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}
