"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Trophy,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Sparkles,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";


interface LevelItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  min_points: number;
  max_points: number | null;
  icon_url: string | null;
  color: string | null;
  min_missions_completed: number;
  min_referrals_active: number;
  requires_approval: boolean;
}

interface LevelFormData {
  name: string;
  description: string;
  min_points: string;
  max_points: string;
  color: string;
  requires_approval: boolean;
}

function levelToForm(level: LevelItem): LevelFormData {
  return {
    name: level.name,
    description: level.description || "",
    min_points: level.min_points.toString(),
    max_points: level.max_points?.toString() || "",
    color: level.color || "#6B7280",
    requires_approval: level.requires_approval,
  };
}

export default function LevelsPage() {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");

  // Modal state
  const [editingLevel, setEditingLevel] = useState<LevelItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<LevelFormData>({
    name: "", description: "", min_points: "0", max_points: "",
    color: "#6B7280", requires_approval: false,
  });



  const loadLevels = useCallback(async () => {
    try {
      const data = await api.get<LevelItem[]>("/api/v1/admin/levels");
      setLevels(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar níveis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  const openModal = (level: LevelItem) => {
    setEditingLevel(level);
    setFormData(levelToForm(level));
    setIsModalOpen(true);
    setModalError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLevel(null);
    setModalError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;
    setIsSubmitting(true);

    try {
      await api.put(`/api/v1/admin/levels/${editingLevel.id}`, {
        name: formData.name,
        description: formData.description || null,
        min_points: parseInt(formData.min_points || "0"),
        max_points: formData.max_points ? parseInt(formData.max_points) : null,
        color: formData.color || null,
        requires_approval: formData.requires_approval,
      });
      showMessage("Nível atualizado com sucesso ✓");
      closeModal();
      loadLevels();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setModalError(apiErr.detail || "Erro ao salvar nível");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Column definitions ───
  const levelColumns: Column<LevelItem>[] = [
    {
      key: "order_index",
      label: "#",
      sortable: true,
      render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span>,
    },
    {
      key: "name",
      label: "Nível",
      sortable: true,
      primary: true,
      render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span>,
    },
    {
      key: "min_points",
      label: "Pontos",
      sortable: true,
      render: (_val, row) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {row.min_points.toLocaleString("pt-BR")}
          {row.max_points ? ` – ${row.max_points.toLocaleString("pt-BR")}` : "+"}
        </span>
      ),
    },
    {
      key: "requires_approval",
      label: "Aprovação",
      sortable: true,
      hideOnMobile: true,
      render: (val) => (
        <span style={{ color: val ? "var(--text)" : "var(--text-tertiary)" }}>
          {val ? "Manual" : "Automática"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Níveis</h1>
          <p className="text-subhead text-secondary">
            Configure os limiares de pontuação para cada nível
          </p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Journey Visual */}
      {!loading && levels.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3
              className="text-headline"
              style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}
            >
              <Sparkles size={20} color="var(--color-primary)" />
              Jornada do Participante
            </h3>
          </div>
          <div
            className="card-body"
            style={{ overflowX: "auto", padding: "var(--space-lg)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                minWidth: "fit-content",
              }}
            >
              {levels.map((level, idx) => {
                const color = level.color || "#6B7280";
                return (
                  <div key={level.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "var(--space-base) var(--space-lg)",
                        borderRadius: "var(--radius-lg)",
                        border: `2px solid ${color}`,
                        background: `${color}10`,
                        minWidth: 140,
                        transition: "all var(--transition-fast)",
                        cursor: "pointer",
                      }}
                      onClick={() => openModal(level)}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color,
                          textAlign: "center",
                        }}
                      >
                        {level.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                          marginTop: "var(--space-xs)",
                        }}
                      >
                        {level.min_points.toLocaleString("pt-BR")}
                        {level.max_points
                          ? ` – ${level.max_points.toLocaleString("pt-BR")}`
                          : "+"}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-sm)",
                          marginTop: "var(--space-xs)",
                          fontSize: "0.7rem",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {level.requires_approval && (
                          <span title="Requer aprovação">
                            <Shield size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < levels.length - 1 && (
                      <ArrowRight size={18} color="var(--text-tertiary)" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Levels Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={levelColumns}
          data={levels}
          loading={loading}
          emptyMessage="Nenhum nível configurado"
          emptyIcon={<Trophy size={32} />}
          onRowClick={(row) => openModal(row)}
          defaultSortKey="order_index"
          id="levels-table"
        />
      </div>

      {/* Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={`Editar Nível — ${editingLevel?.name || ""}`}
        icon={<Trophy size={20} color="var(--color-primary)" />}
        size="md"
        id="level-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="level-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="level-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          {/* Nome */}
          <div className="form-group">
            <label htmlFor="level-name" className="label">Nome <span style={{ color: "var(--color-danger)" }}>*</span></label>
            <input id="level-name" className="input" name="name" value={formData.name} onChange={handleInputChange} required />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label htmlFor="level-description" className="label">Descrição</label>
            <textarea id="level-description" className="input" name="description" value={formData.description} onChange={handleInputChange} rows={2} style={{ resize: "vertical" }} />
          </div>

          {/* Pontos */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="level-min-points" className="label">Pontos Mínimos <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input id="level-min-points" className="input" type="number" min={0} name="min_points" value={formData.min_points} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="level-max-points" className="label">Pontos Máximos</label>
              <input id="level-max-points" className="input" type="number" min={0} name="max_points" value={formData.max_points} onChange={handleInputChange} placeholder="Sem limite" />
            </div>
          </div>

          {/* Cor */}
          <div className="form-group">
            <label className="label">Cor</label>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                style={{
                  width: 48,
                  height: 48,
                  padding: 0,
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-base)",
                  cursor: "pointer",
                  background: "transparent",
                }}
              />
              <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                {formData.color}
              </span>
            </div>
          </div>

          {/* Aprovação manual */}
          <div className="form-group">
            <label className="label">Aprovação manual</label>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
              <label className="toggle" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" name="requires_approval" checked={formData.requires_approval} onChange={handleInputChange} />
                <div className="toggle__track" /><div className="toggle__thumb" />
              </label>
              <span style={{ fontSize: "0.9375rem", color: "var(--text)" }}>{formData.requires_approval ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* Info Box */}
      <div
        style={{
          padding: "var(--space-base) var(--space-lg)",
          background: "rgba(59, 130, 246, 0.06)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
          borderRadius: "var(--radius-base)",
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        <strong>ℹ️ Como funciona a progressão:</strong>
        <ul style={{ margin: "var(--space-xs) 0 0 var(--space-lg)", padding: 0 }}>
          <li>A progressão é <strong>monotônica</strong> — usuários não perdem nível por inatividade.</li>
          <li>Níveis com <strong>&quot;Aprovação manual&quot;</strong> exigem aprovação de um admin antes da promoção.</li>
          <li>Os campos <strong>Slug</strong> e <strong>Ordem</strong> são fixos para manter a integridade da jornada.</li>
          <li>Alterações nos limiares afetam <strong>novos avanços</strong> — usuários já promovidos mantêm seu nível.</li>
        </ul>
      </div>
    </div>
  );
}
