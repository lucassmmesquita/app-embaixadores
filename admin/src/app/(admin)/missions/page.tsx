"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Target, AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

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
  category_id: string | null;
  category?: MissionCategory;
}

const ACTION_TYPES = [
  { value: "INVITE", label: "Convites aceitos / Engajamento" },
  { value: "EVENT_ATTENDANCE", label: "Participação em eventos" },
  { value: "CONTENT_SHARE", label: "Compartilhamento de materiais" }
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
  const [modalError, setModalError] = useState("");

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
    setModalError("");
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
    setModalError("");
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
    
    // Clean up empty strings for UUID fields
    const payload = { ...formData };
    if (payload.category_id === "") {
      payload.category_id = null;
    }
    
    try {
      if (editingMission) {
        await api.patch(`/api/v1/admin/missions/${editingMission.id}`, payload);
        showMessage("Missão atualizada com sucesso");
      } else {
        await api.post("/api/v1/admin/missions", payload);
        showMessage("Missão criada com sucesso");
      }
      closeModal();
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string | any[] };
      let errMsg = "Erro ao salvar missão";
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

  const toggleStatus = async (mission: Mission) => {
    try {
      await api.patch(`/api/v1/admin/missions/${mission.id}`, { is_active: !mission.is_active });
      setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, is_active: !m.is_active } : m));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar status", true);
    }
  };

  const missionColumns: Column<Mission>[] = [
    {
      key: "title",
      label: "Missão",
      sortable: true,
      primary: true,
      render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span>,
    },
    {
      key: "action_type",
      label: "Ação",
      sortable: true,
      hideOnMobile: true,
      render: (val) => <span style={{ color: "var(--text-secondary)" }}>{ACTION_TYPES.find(t => t.value === val)?.label || String(val)}</span>,
    },
    {
      key: "points_reward",
      label: "Pontos",
      sortable: true,
      align: "right",
      render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (_val, row) => (
        <label className="toggle" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={!!row.is_active} onChange={() => toggleStatus(row)} />
          <div className="toggle__track" />
          <div className="toggle__thumb" />
        </label>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Missões</h1>
          <p className="text-subhead text-secondary">{missions.length} missão(ões)</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
          <Link href="/moderation" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)", textDecoration: "none" }}>
            <ShieldAlert size={18} />
            Moderação
          </Link>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} />
            Nova Missão
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={missionColumns}
          data={missions}
          loading={loading}
          emptyMessage="Nenhuma missão encontrada"
          emptyIcon={<Target size={32} />}
          onRowClick={(row) => openModal(row)}
          defaultSortKey="title"
          id="missions-table"
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingMission ? "Editar Missão" : "Nova Missão"}
        icon={<Target size={20} color="var(--color-primary)" />}
        size="lg"
        id="mission-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="mission-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="mission-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>

          {/* Título */}
          <div className="form-group">
            <label className="label">Título *</label>
            <input required type="text" className="input" name="title" value={formData.title} onChange={handleInputChange} />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label className="label">Descrição *</label>
            <textarea required className="input" name="description" value={formData.description} onChange={handleInputChange} rows={3} />
          </div>

          {/* Tipo + Pontos */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="label">Tipo de Ação *</label>
              <select required className="input" name="action_type" value={formData.action_type} onChange={handleInputChange}>
                {ACTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Pontos *</label>
              <input required type="number" min="0" className="input" name="points_reward" value={formData.points_reward} onChange={handleInputChange} />
            </div>
          </div>

          {/* Seção Recorrência */}
          <fieldset style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "var(--space-base)", display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
            <legend style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", padding: "0 var(--space-sm)" }}>Recorrência</legend>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="label">Recorrência *</label>
                <select required className="input" name="recurrence" value={formData.recurrence} onChange={handleInputChange}>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Qtd Necessária *</label>
                <input required type="number" min="1" className="input" name="required_count" value={formData.required_count} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="label">Limite Total de Tentativas</label>
                <input type="number" min="1" className="input" name="max_submissions" value={formData.max_submissions} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="label">Limite Diário (0 = s/ limite)</label>
                <input type="number" min="0" className="input" name="max_daily_completions" value={formData.max_daily_completions} onChange={handleInputChange} />
              </div>
            </div>
          </fieldset>

          {/* Opções */}
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="requires_verification" checked={formData.requires_verification} onChange={(e) => { handleInputChange(e); if (e.target.checked) setFormData(prev => ({ ...prev, is_self_declared: false })); }} />
              <span>Verificação manual (vai para fila de moderação)</span>
            </label>

            <label className="checkbox-label">
              <input type="checkbox" name="is_self_declared" checked={formData.is_self_declared} onChange={(e) => { handleInputChange(e); if (e.target.checked) setFormData(prev => ({ ...prev, requires_verification: false })); }} />
              <span>Aprovação automática</span>
            </label>

            <label className="checkbox-label">
              <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
              <span>Destacar na tela inicial</span>
            </label>
          </div>

          {editingMission && (
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
