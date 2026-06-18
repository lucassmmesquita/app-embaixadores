"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Target, AlertTriangle, Edit2, Trash2, X } from "lucide-react";

interface MissionCategory {
  id: string;
  name: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  action_type: string;
  points_reward: number;
  is_active: boolean;
  recurrence: string;
  required_count: number;
  requires_verification: boolean;
  is_self_declared: boolean;
  max_submissions: number;
  max_daily_completions: number;
  is_featured: boolean;
  category_id: string;
  category?: MissionCategory;
}

const ACTION_TYPES = [
  { value: "INVITE", label: "Convite" },
  { value: "EVENT_ATTENDANCE", label: "Evento" },
  { value: "CONTENT_SHARE", label: "Compartilhamento" },
  { value: "ORGANIZE_MEETUP", label: "Encontro" },
  { value: "SPREAD_PROPOSAL", label: "Proposta" },
  { value: "COLLECT_DEMAND", label: "Demanda" },
  { value: "TRAINING", label: "Formação" }
];

const RECURRENCE_OPTIONS = [
  { value: "ONE_TIME", label: "Única" },
  { value: "DAILY", label: "Diária" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "PER_EVENT", label: "Por Evento" }
];

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [categories, setCategories] = useState<MissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [formData, setFormData] = useState<Partial<Mission>>({
    title: "",
    description: "",
    action_type: "INVITE",
    points_reward: 10,
    recurrence: "ONE_TIME",
    required_count: 1,
    requires_verification: false,
    is_self_declared: false,
    max_submissions: 1,
    max_daily_completions: 0,
    is_featured: false,
    is_active: true,
    category_id: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [missionsData, categoriesData] = await Promise.all([
        api.get<{ items: Mission[] }>("/api/v1/admin/missions?page_size=100"),
        api.get<MissionCategory[]>("/api/v1/missions/categories")
      ]);
      setMissions(missionsData.items || []);
      setCategories(categoriesData || []);
      
      if (categoriesData.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: categoriesData[0].id }));
      }
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

  const openModal = (mission?: Mission) => {
    if (mission) {
      setEditingMission(mission);
      setFormData({
        title: mission.title,
        description: mission.description,
        action_type: mission.action_type,
        points_reward: mission.points_reward,
        recurrence: mission.recurrence,
        required_count: mission.required_count,
        requires_verification: mission.requires_verification,
        is_self_declared: mission.is_self_declared,
        max_submissions: mission.max_submissions,
        max_daily_completions: mission.max_daily_completions,
        is_featured: mission.is_featured,
        is_active: mission.is_active,
        category_id: mission.category_id
      });
    } else {
      setEditingMission(null);
      setFormData({
        title: "",
        description: "",
        action_type: "INVITE",
        points_reward: 10,
        recurrence: "ONE_TIME",
        required_count: 1,
        requires_verification: false,
        is_self_declared: false,
        max_submissions: 1,
        max_daily_completions: 0,
        is_featured: false,
        is_active: true,
        category_id: categories.length > 0 ? categories[0].id : ""
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMission(null);
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
      if (editingMission) {
        await api.patch(`/api/v1/admin/missions/${editingMission.id}`, formData);
        showMessage("Missão atualizada com sucesso");
      } else {
        await api.post("/api/v1/admin/missions", formData);
        showMessage("Missão criada com sucesso");
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao salvar missão", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja desativar esta missão?")) return;
    
    try {
      await api.delete(`/api/v1/admin/missions/${id}`);
      showMessage("Missão desativada com sucesso");
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao excluir missão", true);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Missões</h1>
          <p className="text-subhead text-secondary">{missions.length} missão(ões)</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          Nova Missão
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Missão</th>
              <th>Categoria</th>
              <th>Ação</th>
              <th>Pontos</th>
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
            ) : missions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhuma missão encontrada
                </td>
              </tr>
            ) : missions.map((mission) => (
              <tr key={mission.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Target size={16} color="var(--color-primary)" />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>{mission.title}</span>
                      {mission.is_featured && <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>Destaque</span>}
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {mission.category?.name || "—"}
                </td>
                <td>
                  <span className="badge badge-info">{ACTION_TYPES.find(t => t.value === mission.action_type)?.label || mission.action_type}</span>
                </td>
                <td><span style={{ fontWeight: 600 }}>{mission.points_reward} pts</span></td>
                <td>
                  <span className={`badge ${mission.is_active ? "badge-success" : "badge-neutral"}`}>
                    {mission.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32 }}
                      onClick={() => openModal(mission)}
                    >
                      <Edit2 size={14} />
                    </button>
                    {mission.is_active && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32, borderColor: "var(--color-error)", color: "var(--color-error)" }}
                        onClick={() => handleDelete(mission.id)}
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
              <h2 className="text-title-3">{editingMission ? "Editar Missão" : "Nova Missão"}</h2>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label className="form-label">Título da Missão *</label>
                <input required type="text" className="form-control" name="title" value={formData.title} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <textarea required className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows={3} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Categoria *</label>
                  <select required className="form-control" name="category_id" value={formData.category_id} onChange={handleInputChange}>
                    <option value="" disabled>Selecione uma categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Tipo de Ação *</label>
                  <select required className="form-control" name="action_type" value={formData.action_type} onChange={handleInputChange}>
                    {ACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Pontos *</label>
                  <input required type="number" min="0" className="form-control" name="points_reward" value={formData.points_reward} onChange={handleInputChange} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Recorrência *</label>
                  <select required className="form-control" name="recurrence" value={formData.recurrence} onChange={handleInputChange}>
                    {RECURRENCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Qtd Necessária *</label>
                  <input required type="number" min="1" className="form-control" name="required_count" value={formData.required_count} onChange={handleInputChange} />
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Limite Total de Tentativas</label>
                  <input type="number" min="1" className="form-control" name="max_submissions" value={formData.max_submissions} onChange={handleInputChange} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Limite Diário (0 = s/ limite)</label>
                  <input type="number" min="0" className="form-control" name="max_daily_completions" value={formData.max_daily_completions} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                  <input type="checkbox" name="requires_verification" checked={formData.requires_verification} onChange={handleInputChange} />
                  <span>Requer verificação manual (vai para fila de moderação)</span>
                </label>
                
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                  <input type="checkbox" name="is_self_declared" checked={formData.is_self_declared} onChange={handleInputChange} />
                  <span>Autodeclarada (aprovada automaticamente ao enviar)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                  <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
                  <span>Missão em Destaque</span>
                </label>
                
                {editingMission && (
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <span>Missão Ativa</span>
                  </label>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-md)", marginTop: "var(--space-lg)", borderTop: "1px solid var(--border-color)", paddingTop: "var(--space-lg)" }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Missão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
