"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  projectCount: number;
  donationCount: number;
  donationTotal: number;
  plan: string;
}

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async (page: number, q: string) => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPages(data.pages);
        setTotal(data.total);
      } else {
        setError("No se pudieron cargar los usuarios");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search, fetchUsers]);

  const changeRole = async (user: AdminUser) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const action =
      newRole === "ADMIN"
        ? `¿Dar rol de administrador a ${user.email}?`
        : `¿Quitar el rol de administrador a ${user.email}?`;
    if (!window.confirm(action)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Error al cambiar el rol");
      }
      await fetchUsers(page, search);
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (
      !window.confirm(
        `¿Eliminar definitivamente a ${user.email}? Se borrarán sus proyectos y se cancelarán sus suscripciones.`
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Error al eliminar el usuario");
      }
      await fetchUsers(page, search);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Usuarios ({total})</CardTitle>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(q.trim());
            }}
          >
            <Input
              placeholder="Buscar email o nombre"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56"
            />
            <Button type="submit" variant="outline" size="sm">
              Buscar
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        {loading ? (
          <p className="text-muted-foreground py-4">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay usuarios
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4 text-right">Proy.</th>
                  <th className="py-2 pr-4 text-right">Donado</th>
                  <th className="py-2 pr-4">Alta</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{u.email}</td>
                    <td className="py-2 pr-4">{u.name || "—"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          u.role === "ADMIN"
                            ? "text-destructive font-semibold"
                            : "text-muted-foreground"
                        }
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{u.plan}</td>
                    <td className="py-2 pr-4 text-right">{u.projectCount}</td>
                    <td className="py-2 pr-4 text-right">
                      {u.donationTotal > 0
                        ? `${u.donationTotal.toFixed(2)} €`
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {u.createdAt.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => changeRole(u)}
                        >
                          {u.role === "ADMIN" ? "Quitar rol" : "Hacer admin"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => removeUser(u)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
