"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { AdminTabs } from "@/components/AdminTabs";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = [
  { value: "ADMIN", label: "Administraator" },
  { value: "ORGANIZER", label: "Korraldaja" },
  { value: "COMPETITOR", label: "Võistleja" },
];

/**
 * Users and roles — the part WordPress used to own.
 * An admin can change a role and start a password reset; nobody but the account
 * holder ever chooses a password.
 */
export default function AdminUsersPage() {
  const { data: session } = useSession();
  const myId = session?.user?.id ? parseInt(session.user.id) : null;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadUsers = useCallback(async (): Promise<AdminUser[]> => {
    const res = await fetch(`/api/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`);
    if (!res.ok) throw new Error("Kasutajate laadimine ebaõnnestus");
    return res.json();
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await loadUsers();
        if (!cancelled) setUsers(rows);
      } catch {
        if (!cancelled) {
          setMessage({ type: "error", text: "Kasutajate laadimine ebaõnnestus" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function changeRole(user: AdminUser, role: string) {
    if (role === user.role) return;
    if (!confirm(`Muuta ${user.name} rolliks ${roleLabel(role)}?`)) return;

    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      notify("success", `${user.name}: roll on nüüd ${roleLabel(role)}`);
    } catch (e) {
      notify("error", e instanceof Error && e.message ? e.message : "Rolli muutmine ebaõnnestus");
    } finally {
      setBusyId(null);
    }
  }

  async function sendReset(user: AdminUser) {
    if (!confirm(`Saata parooli taastamise link aadressile ${user.email}?`)) return;

    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password-reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify("success", data.message);
    } catch (e) {
      notify("error", e instanceof Error && e.message ? e.message : "Saatmine ebaõnnestus");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSkeleton titleWidth="w-64" blocks={1} blockHeight="h-64" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Haldus</h1>
      <AdminTabs />

      <MessageBanner message={message} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
        className="flex gap-2 mb-4"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Otsi nime või e-posti järgi"
          className="flex-1 max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
        >
          Otsi
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-gray-500 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Nimi</th>
              <th className="px-4 py-3 font-medium">E-post</th>
              <th className="px-4 py-3 font-medium">Liitunud</th>
              <th className="px-4 py-3 font-medium">Roll</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Kasutajaid ei leitud
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isMe = user.id === myId;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {user.name}
                      {isMe && <span className="ml-2 text-xs text-gray-400">(sina)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value)}
                        disabled={isMe || busyId === user.id}
                        title={isMe ? "Oma rolli muuta ei saa" : undefined}
                        className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => sendReset(user)}
                        disabled={busyId === user.id}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        Saada parooli taastamise link
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Link saadetakse kasutaja e-posti aadressile. Administraator ei näe ega määra kellegi parooli.
      </p>
    </div>
  );
}

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label || role;
}
