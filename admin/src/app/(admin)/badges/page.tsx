"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Trophy, AlertTriangle } from "lucide-react";
import { IconPicker } from "@/components/ui/IconPicker";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

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
  const [modalError, setModalError] = useState("");
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
    setModalError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBadge(null);
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
      setModalError(apiErr.detail || "Erro ao salvar conquista");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (badge: Badge) => {
    try {
      await api.patch(`/api/v1/admin/badges/${badge.id}`, { is_active: !badge.is_active });
      setBadges(prev => prev.map(b => b.id === badge.id ? { ...b, is_active: !b.is_active } : b));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar status", true);
    }
  };

  const badgeColumns: Column<Badge>[] = [
    { key: "name", label: "Conquista", sortable: true, primary: true, render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span> },
    { key: "criteria_type", label: "Critério", sortable: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{CRITERIA_TYPES.find(t => t.value === val)?.label || String(val)}</span> },
    { key: "criteria_value", label: "Meta", sortable: true, align: "right", render: (val) => <span style={{ fontWeight: 600 }}>{String(val ?? "—")}</span> },
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
          <h1 className="text-title-2">Conquistas</h1>
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
        <DataTable columns={badgeColumns} data={badges} loading={loading} emptyMessage="Nenhuma conquista encontrada" emptyIcon={<Trophy size={32} />} onRowClick={(row) => openModal(row)} defaultSortKey="name" id="badges-table" />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingBadge ? "Editar Conquista" : "Nova Conquista"}
        icon={<Trophy size={20} color="var(--color-primary)" />}
        size="lg"
        id="badge-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="badge-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="badge-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          <div className="form-group">
            <label className="label">Título *</label>
            <input required type="text" className="input" name="name" value={formData.name || ""} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label className="label">Descrição *</label>
            <textarea required className="input" name="description" value={formData.description || ""} onChange={handleInputChange} rows={2} />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="label">Critério *</label>
              <select required className="input" name="criteria_type" value={formData.criteria_type || ""} onChange={handleInputChange}>
                {CRITERIA_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Meta do Critério *</label>
              <input required type="number" min="1" className="input" name="criteria_value" value={formData.criteria_value || ""} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <IconPicker
              label="Imagem"
              value={formData.icon_url || ""}
              onChange={(val) => setFormData(p => ({ ...p, icon_url: val }))}
            />
          </div>

          {editingBadge && (
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
