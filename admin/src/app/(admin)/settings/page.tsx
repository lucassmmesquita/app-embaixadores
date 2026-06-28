"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Settings, Plus, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

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

const EMPTY_FORM = { email: "", password: "", full_name: "", role: "campaign_manager" };

export default function SettingsPage() {
  const { hasPermission, admin } = useAuth();
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const openModal = (adminUser?: AdminUserItem) => {
    setModalError("");
    if (adminUser) {
      setEditingAdmin(adminUser);
      setFormData({
        full_name: adminUser.full_name,
        email: adminUser.email,
        password: "",
        role: adminUser.role,
      });
    } else {
      setEditingAdmin(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
    setModalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError("");

    try {
      if (editingAdmin) {
        const payload: Record<string, unknown> = {
          full_name: formData.full_name,
          role: formData.role,
        };
        if (formData.password) payload.password = formData.password;
        await api.put(`/api/v1/admin-auth/users/${editingAdmin.id}`, payload);
        showMessage("Administrador atualizado com sucesso ✓");
      } else {
        await api.post("/api/v1/admin-auth/users", formData);
        showMessage("Administrador criado com sucesso ✓");
      }
      closeModal();
      loadAdmins();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setModalError(apiErr.detail || "Erro ao salvar administrador");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminColumns: Column<AdminUserItem>[] = [
    { key: "full_name", label: "Nome", sortable: true, primary: true, render: (_val, row) => (
      <span style={{ fontWeight: 500 }}>
        {row.full_name}
        {row.id === admin?.id && <span className="badge badge-info" style={{ marginLeft: 8 }}>Você</span>}
      </span>
    )},
    { key: "email", label: "Email", sortable: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{String(val)}</span> },
    { key: "role", label: "Perfil", sortable: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{ROLE_LABELS[String(val)] || String(val)}</span> },
    { key: "is_active", label: "Status", sortable: true, render: (val) => (
      <span className={`badge ${val ? "badge-success" : "badge-danger"}`}>{val ? "Ativo" : "Inativo"}</span>
    )},
    { key: "last_login_at", label: "Último Acesso", sortable: true, hideOnMobile: true, render: (val) => (
      <span style={{ color: "var(--text-tertiary)" }}>{val ? new Date(String(val)).toLocaleString("pt-BR") : "Nunca"}</span>
    )},
    { key: "created_at", label: "Cadastro", sortable: true, hideOnMobile: true, render: (val) => (
      <span style={{ color: "var(--text-tertiary)" }}>{new Date(String(val)).toLocaleDateString("pt-BR")}</span>
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Configurações</h1>
          <p className="text-subhead text-secondary">{admins.length} administrador(es)</p>
        </div>
        {hasPermission("admin_users", "create") && (
          <button className="btn btn-primary" onClick={() => openModal()} id="create-admin-btn">
            <Plus size={18} />
            Novo Admin
          </button>
        )}
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={adminColumns}
          data={admins}
          loading={loading}
          emptyMessage="Nenhum administrador encontrado"
          emptyIcon={<Shield size={32} />}
          onRowClick={(row) => openModal(row)}
          defaultSortKey="full_name"
          id="admins-table"
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingAdmin ? "Editar Administrador" : "Novo Administrador"}
        icon={<Settings size={20} color="var(--color-primary)" />}
        size="md"
        id="admin-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              type="submit"
              form="admin-form"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.email || !formData.full_name || (!editingAdmin && !formData.password)}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="admin-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          <div className="form-group">
            <label className="label">Nome completo *</label>
            <input
              className="input"
              name="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome do administrador"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Email {!editingAdmin && "*"}</label>
            <input
              className="input"
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@email.com"
              required={!editingAdmin}
              disabled={!!editingAdmin}
              style={editingAdmin ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="label">Senha {!editingAdmin ? "*" : "(deixe vazio para manter)"}</label>
              <input
                className="input"
                type="password"
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingAdmin ? "Nova senha (opcional)" : "Min. 8 caracteres"}
                required={!editingAdmin}
              />
            </div>

            <div className="form-group">
              <label className="label">Perfil *</label>
              <select
                className="input"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
