"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Search,
  UserCog,
  Shield,
  Ban,
  CheckCircle2,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  total_points: number;
  role: string;
  is_active: boolean;
  level_pending_approval: boolean;
  created_at: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

const ROLE_LABELS: Record<string, string> = {
  participant: "Participante",
  moderator: "Moderador",
  regional_coordinator: "Coordenador",
  campaign_manager: "Gestor",
  analyst: "Analista",
  super_admin: "Super Admin",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  participant: "badge-neutral",
  moderator: "badge-warning",
  regional_coordinator: "badge-info",
  campaign_manager: "badge-primary",
  analyst: "badge-neutral",
  super_admin: "badge-danger",
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.set("search", search);

      const data = await api.get<UsersResponse>(`/api/v1/admin/users?${params}`);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/v1/admin/reports/export?report_type=users&days=365`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_access_token")}`,
        },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "usuarios.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro ao exportar");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-base)" }}>
        <div>
          <h1 className="text-title-2">Gestão de Usuários</h1>
          <p className="text-subhead text-secondary">{total} usuário(s) cadastrado(s)</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {hasPermission("users", "export") && (
            <button className="btn btn-outline btn-sm" onClick={handleExport} id="export-users-btn">
              <Download size={16} />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400 }}>
        <Search size={18} style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-tertiary)",
        }} />
        <input
          type="text"
          className="input"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ paddingLeft: 40 }}
          id="search-users"
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Cidade/UF</th>
                <th>Pontos</th>
                <th>Role</th>
                <th>Status</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-pill)",
                          background: "var(--color-primary-50)",
                          color: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          flexShrink: 0,
                        }}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{user.full_name}</span>
                        {user.level_pending_approval && (
                          <span className="badge badge-warning" style={{ fontSize: "0.625rem" }}>Pendente</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {user.city && user.state ? `${user.city}/${user.state}` : "—"}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {user.total_points.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_CLASS[user.role] || "badge-neutral"}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="badge badge-success">Ativo</span>
                      ) : (
                        <span className="badge badge-danger">Suspenso</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: "var(--space-base)",
            borderTop: "1px solid var(--separator)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-sm)",
          }}>
            <button
              className="pagination__btn"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "0 var(--space-sm)" }}>
              Página {page} de {totalPages}
            </span>
            <button
              className="pagination__btn"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
