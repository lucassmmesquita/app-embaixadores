"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Coins, AlertTriangle, Edit2, X } from "lucide-react";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <table className="data-table">
          <thead>
            <tr>
              <th>Ação</th>
              <th>Categoria</th>
              <th>Pontos</th>
              <th>Descrição</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : configs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhuma pontuação encontrada
                </td>
              </tr>
            ) : configs.map((config) => (
              <tr key={config.key}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Coins size={16} color="var(--color-primary)" />
                    <span style={{ fontWeight: 500 }}>{config.label}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {CATEGORY_LABELS[config.category] || config.category}
                </td>
                <td><span style={{ fontWeight: 600 }}>{config.points} pts</span></td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {config.description || "—"}
                </td>
                <td>
                  <span className={`badge ${config.is_active ? "badge-success" : "badge-neutral"}`}>
                    {config.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32 }}
                    onClick={() => openModal(config)}
                    id={`point-edit-btn-${config.key}`}
                  >
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ MODAL ═══ */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "var(--space-lg)"
        }}>
          <div className="card" style={{
            width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-lg)", borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-title-3">{editingConfig ? "Editar Pontuação" : "Nova Pontuação"}</h2>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {modalError && <div className="alert alert-error" style={{ marginBottom: "var(--space-sm)" }}><AlertTriangle size={18} />{modalError}</div>}

              {/* Chave — somente criação (readonly na edição) */}
              <div className="form-group">
                <label className="form-label">Chave (identificador) {!editingConfig && "*"}</label>
                {editingConfig ? (
                  <div style={{ padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", background: "var(--bg-hover)", fontFamily: "monospace", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {editingConfig.key}
                  </div>
                ) : (
                  <input
                    required
                    type="text"
                    className="form-control"
                    name="key"
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                    placeholder="ex: event_share"
                  />
                )}
              </div>

              {/* Nome da ação */}
              <div className="form-group">
                <label className="form-label">Nome da Ação *</label>
                <input required type="text" className="form-control" name="label" value={formData.label} onChange={handleInputChange} placeholder="ex: Compartilhamento de evento" />
              </div>

              {/* Descrição */}
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input type="text" className="form-control" name="description" value={formData.description} onChange={handleInputChange} placeholder="Descreva quando esses pontos são concedidos" />
              </div>

              {/* Pontos + Categoria */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Pontos *</label>
                  <input required type="number" min="0" className="form-control" name="points" value={formData.points} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select required className="form-control" name="category" value={formData.category} onChange={handleInputChange}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ativo (somente edição) */}
              {editingConfig && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-xs)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <span>Pontuação Ativa</span>
                  </label>
                </div>
              )}

              {/* Ações */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-md)", marginTop: "var(--space-lg)", borderTop: "1px solid var(--border-color)", paddingTop: "var(--space-lg)" }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Pontuação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
