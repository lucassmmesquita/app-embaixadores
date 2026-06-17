"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Settings, Users, Shield, Plus, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";

interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  campaign_manager: "Gestor de Campanha",
  regional_coordinator: "Coordenador Regional",
  moderator: "Moderador",
  analyst: "Analista",
};

export default function SettingsPage() {
  const { hasPermission, admin } = useAuth();
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "campaign_manager" });
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await api.get<AdminUserItem[]>("/api/v1/admin-auth/users");
      setAdmins(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar admins");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/api/v1/admin-auth/users", form);
      setSuccess("Admin criado com sucesso!");
      setShowCreate(false);
      setForm({ email: "", password: "", full_name: "", role: "campaign_manager" });
      loadAdmins();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao criar admin");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Configurações</h1>
          <p className="text-subhead text-secondary">Gerenciar administradores e permissões</p>
        </div>
        {hasPermission("admin_users", "create") && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)} id="create-admin-btn">
            <Plus size={18} />
            Novo Admin
          </button>
        )}
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      {/* Create Form */}
      {showCreate && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-headline">Novo Administrador</h3>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-base)" }}>
              <div className="form-group">
                <label className="label">Nome Completo</label>
                <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nome do admin" />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@email.com" />
              </div>
              <div className="form-group">
                <label className="label">Senha</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 caracteres" />
              </div>
              <div className="form-group">
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.email || !form.password || !form.full_name}>
                {creating ? "Criando..." : "Criar Admin"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin List */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header">
          <h3 className="text-headline" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <Shield size={20} color="var(--color-primary)" />
            Administradores
          </h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Último Acesso</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : admins.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 500 }}>
                  {a.full_name}
                  {a.id === admin?.id && <span className="badge badge-info" style={{ marginLeft: 8 }}>Você</span>}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{a.email}</td>
                <td><span className="badge badge-primary">{ROLE_LABELS[a.role] || a.role}</span></td>
                <td>
                  <span className={`badge ${a.is_active ? "badge-success" : "badge-danger"}`}>
                    {a.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                  {a.last_login_at ? new Date(a.last_login_at).toLocaleString("pt-BR") : "Nunca"}
                </td>
                <td style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                  {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
