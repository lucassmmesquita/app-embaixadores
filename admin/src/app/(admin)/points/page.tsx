"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Coins, AlertTriangle } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

interface PointConfig {
  id: string;
  key: string;
  points: number;
  label: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Autenticação",
  invitations: "Convites",
  missions: "Missões",
  events: "Eventos",
  content: "Conteúdo",
};

export default function PointsPage() {
  const [configs, setConfigs] = useState<PointConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [modalError, setModalError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PointConfig | null>(null);
  const [formData, setFormData] = useState({
    key: "",
    points: 10,
    label: "",
    description: "",
    category: "events",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.get<PointConfig[]>("/api/v1/admin/point-configs");
      setConfigs(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setInfo(msg);
    setTimeout(() => { setError(""); setInfo(""); }, 3000);
  };

  const openModal = (config?: PointConfig) => {
    setModalError("");
    if (config) {
      setEditingConfig(config);
      setFormData({
        key: config.key,
        points: config.points,
        label: config.label,
        description: config.description || "",
        category: config.category,
        is_active: config.is_active,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        key: "",
        points: 10,
        label: "",
        description: "",
        category: "events",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
    setModalError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setFormData(prev => ({
      ...prev,
      [name]: target.type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingConfig) {
        await api.put(`/api/v1/admin/point-configs/${editingConfig.key}`, {
          points: formData.points,
          label: formData.label,
          description: formData.description || null,
          category: formData.category,
          is_active: formData.is_active,
        });
        showMessage("Pontuação atualizada com sucesso");
      } else {
        await api.post("/api/v1/admin/point-configs", {
          key: formData.key,
          points: formData.points,
          label: formData.label,
          description: formData.description || null,
          category: formData.category,
        });
        showMessage("Pontuação criada com sucesso");
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string | any[] };
      let errMsg = "Erro ao salvar";
      if (typeof apiErr.detail === "string") {
        errMsg = apiErr.detail;
      } else if (Array.isArray(apiErr.detail)) {
        errMsg = apiErr.detail.map(d => {
          const field = d.loc && d.loc.length > 1 ? d.loc[1] : "Campo";
          return `${field}: ${d.msg}`;
        }).join(", ");
      }
      setModalError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (config: PointConfig) => {
    try {
      await api.put(`/api/v1/admin/point-configs/${config.key}`, { points: config.points, label: config.label, description: config.description, category: config.category, is_active: !config.is_active });
      setConfigs(prev => prev.map(c => c.key === config.key ? { ...c, is_active: !c.is_active } : c));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar status", true);
    }
  };

  const pointColumns: Column<PointConfig>[] = [
    { key: "label", label: "Ação", sortable: true, primary: true, render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span> },
    { key: "category", label: "Categoria", sortable: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{CATEGORY_LABELS[String(val)] || String(val)}</span> },
    { key: "points", label: "Pontos", sortable: true, align: "right", render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span> },
    { key: "description", label: "Descrição", hideOnMobile: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{val ? String(val) : "—"}</span> },
    { key: "is_active", label: "Status", sortable: true, render: (_val, row) => (
      <label className="toggle" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={!!row.is_active} onChange={() => toggleStatus(row)} />
        <div className="toggle__track" /><div className="toggle__thumb" />
      </label>
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Pontuações</h1>
          <p className="text-subhead text-secondary">{configs.length} configuração(ões)</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()} id="create-point-config-btn">
          <Plus size={18} />
          Nova Pontuação
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable columns={pointColumns} data={configs} loading={loading} emptyMessage="Nenhuma pontuação encontrada" emptyIcon={<Coins size={32} />} onRowClick={(row) => openModal(row)} defaultSortKey="label" rowKey={"key" as keyof PointConfig & string} id="points-table" />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingConfig ? "Editar Pontuação" : "Nova Pontuação"}
        icon={<Coins size={20} color="var(--color-primary)" />}
        size="md"
        id="point-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="point-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="point-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>


          <div className="form-group">
            <label className="label">Identificador {!editingConfig && "*"}</label>
            {editingConfig ? (
              <div style={{ padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", background: "var(--bg-hover)", fontFamily: "monospace", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {editingConfig.key}
              </div>
            ) : (
              <input
                required
                type="text"
                className="input"
                name="key"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                placeholder="ex: event_share"
              />
            )}
          </div>

          <div className="form-group">
            <label className="label">Nome *</label>
            <input required type="text" className="input" name="label" value={formData.label} onChange={handleInputChange} placeholder="ex: Compartilhamento de evento" />
          </div>

          <div className="form-group">
            <label className="label">Descrição</label>
            <input type="text" className="input" name="description" value={formData.description} onChange={handleInputChange} placeholder="Descreva quando esses pontos são concedidos" />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="label">Pontos *</label>
              <input required type="number" min="0" className="input" name="points" value={formData.points} onChange={handleInputChange} />
            </div>

            <div className="form-group">
              <label className="label">Categoria *</label>
              <select required className="input" name="category" value={formData.category} onChange={handleInputChange}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {editingConfig && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0" }}>
              <label className="toggle" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                <div className="toggle__track" /><div className="toggle__thumb" />
              </label>
              <span style={{ fontSize: "0.9375rem", color: "var(--text)" }}>{formData.is_active ? "Ativo" : "Inativo"}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
