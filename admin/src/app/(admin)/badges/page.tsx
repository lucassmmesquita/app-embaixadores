"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trophy, AlertTriangle, Edit2, Trash2, X } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  rarity: string;
  criteria_type: string | null;
  criteria_value: number | null;
  is_active: boolean;
}

const CRITERIA_TYPES = [
  { value: "points_threshold", label: "Pontos Acumulados" },
  { value: "missions_completed", label: "Missões Concluídas" },
  { value: "events_attended", label: "Eventos Comparecidos" },
  { value: "referrals", label: "Convites (Indicações)" }
];

const RARITY_TYPES = [
  { value: "common", label: "Comum" },
  { value: "uncommon", label: "Incomum" },
  { value: "rare", label: "Raro" },
  { value: "epic", label: "Épico" },
  { value: "legendary", label: "Lendário" }
];

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [formData, setFormData] = useState<Partial<Badge>>({
    name: "",
    description: "",
    icon_url: "",
    category: "achievement",
    rarity: "common",
    criteria_type: "points_threshold",
    criteria_value: 100,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const badgesData = await api.get<Badge[]>("/api/v1/admin/badges");
      setBadges(badgesData || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar conquistas");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setInfo(msg);
    setTimeout(() => { setError(""); setInfo(""); }, 3000);
  };

  const openModal = (badge?: Badge) => {
    if (badge) {
      setEditingBadge(badge);
      setFormData({
        name: badge.name,
        description: badge.description,
        icon_url: badge.icon_url || "",
        category: badge.category,
        rarity: badge.rarity,
        criteria_type: badge.criteria_type || "points_threshold",
        criteria_value: badge.criteria_value || 100,
        is_active: badge.is_active
      });
    } else {
      setEditingBadge(null);
      setFormData({
        name: "",
        description: "",
        icon_url: "",
        category: "achievement",
        rarity: "common",
        criteria_type: "points_threshold",
        criteria_value: 100,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBadge(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    
    setFormData(prev => ({
      ...prev,
      [name]: target.type === "number" ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingBadge) {
        await api.patch(`/api/v1/admin/badges/${editingBadge.id}`, formData);
        showMessage("Conquista atualizada com sucesso");
      } else {
        await api.post("/api/v1/admin/badges", formData);
        showMessage("Conquista criada com sucesso");
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao salvar conquista", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja inativar esta conquista?")) return;
    
    try {
      await api.delete(`/api/v1/admin/badges/${id}`);
      showMessage("Conquista inativada com sucesso");
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao inativar conquista", true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Conquistas</h1>
          <p className="text-subhead text-secondary">{badges.length} conquista(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          Nova Conquista
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Conquista</th>
              <th>Critério</th>
              <th>Meta</th>
              <th>Raridade</th>
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
            ) : badges.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhuma conquista encontrada
                </td>
              </tr>
            ) : badges.map((badge) => (
              <tr key={badge.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Trophy size={16} color="var(--color-primary)" />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>{badge.name}</span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {CRITERIA_TYPES.find(t => t.value === badge.criteria_type)?.label || badge.criteria_type}
                </td>
                <td><span style={{ fontWeight: 600 }}>{badge.criteria_value}</span></td>
                <td>
                  <span className="badge badge-info">{RARITY_TYPES.find(r => r.value === badge.rarity)?.label || badge.rarity}</span>
                </td>
                <td>
                  <span className={`badge ${badge.is_active ? "badge-success" : "badge-neutral"}`}>
                    {badge.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32 }}
                      onClick={() => openModal(badge)}
                    >
                      <Edit2 size={14} />
                    </button>
                    {badge.is_active && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32, borderColor: "var(--color-error)", color: "var(--color-error)" }}
                        onClick={() => handleDelete(badge.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "var(--space-lg)"
        }}>
          <div className="card" style={{ 
            width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-lg)", borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-title-3">{editingBadge ? "Editar Conquista" : "Nova Conquista"}</h2>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label className="form-label">Nome da Conquista *</label>
                <input required type="text" className="form-control" name="name" value={formData.name || ""} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <textarea required className="form-control" name="description" value={formData.description || ""} onChange={handleInputChange} rows={2} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Critério *</label>
                  <select required className="form-control" name="criteria_type" value={formData.criteria_type || ""} onChange={handleInputChange}>
                    {CRITERIA_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Meta do Critério *</label>
                  <input required type="number" min="1" className="form-control" name="criteria_value" value={formData.criteria_value || ""} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Raridade</label>
                  <select required className="form-control" name="rarity" value={formData.rarity || ""} onChange={handleInputChange}>
                    {RARITY_TYPES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">URL do Ícone</label>
                  <input type="text" className="form-control" name="icon_url" value={formData.icon_url || ""} onChange={handleInputChange} placeholder="https://..." />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                {editingBadge && (
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <span>Conquista Ativa</span>
                  </label>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-md)", marginTop: "var(--space-lg)", borderTop: "1px solid var(--border-color)", paddingTop: "var(--space-lg)" }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Conquista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
