"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import {
  Trophy,
  Save,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Shield,
  Users,
  Target,
  Sparkles,
} from "lucide-react";

// ═══ EMOJI OPTIONS — Same set used in the PWA app for levels ═══
const EMOJI_CATEGORIES = [
  {
    label: "Progressão",
    emojis: ["🌱", "⚡", "🔥", "🏆", "👑", "⭐", "💎", "🚀", "🎯", "🏅"],
  },
  {
    label: "Natureza",
    emojis: ["🌟", "🌈", "🌊", "🦁", "🦅", "🐉", "🌸", "🌻", "🍀", "🌙"],
  },
  {
    label: "Ações",
    emojis: ["💪", "🤝", "✊", "🙌", "👏", "🫡", "🎉", "🎊", "🎈", "🎁"],
  },
  {
    label: "Objetos",
    emojis: ["🛡️", "⚔️", "🗡️", "🏰", "🔱", "🔮", "💰", "🗝️", "🧭", "📯"],
  },
  {
    label: "Símbolos",
    emojis: ["✨", "💫", "🔶", "🔷", "❤️", "💜", "💙", "💚", "🧡", "🤍"],
  },
];

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
  icon_url: string;
  color: string;
  min_missions_completed: string;
  min_referrals_active: string;
  requires_approval: boolean;
}

function levelToForm(level: LevelItem): LevelFormData {
  return {
    name: level.name,
    description: level.description || "",
    min_points: level.min_points.toString(),
    max_points: level.max_points?.toString() || "",
    icon_url: level.icon_url || "",
    color: level.color || "#6B7280",
    min_missions_completed: level.min_missions_completed.toString(),
    min_referrals_active: level.min_referrals_active.toString(),
    requires_approval: level.requires_approval,
  };
}

function hasChanges(original: LevelItem, form: LevelFormData): boolean {
  return (
    original.name !== form.name ||
    (original.description || "") !== form.description ||
    original.min_points !== parseInt(form.min_points || "0") ||
    (original.max_points?.toString() || "") !== form.max_points ||
    (original.icon_url || "") !== form.icon_url ||
    (original.color || "#6B7280") !== form.color ||
    original.min_missions_completed !== parseInt(form.min_missions_completed || "0") ||
    original.min_referrals_active !== parseInt(form.min_referrals_active || "0") ||
    original.requires_approval !== form.requires_approval
  );
}

export default function LevelsPage() {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [forms, setForms] = useState<Record<string, LevelFormData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerId(null);
      }
    }
    if (openPickerId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openPickerId]);

  const loadLevels = useCallback(async () => {
    try {
      const data = await api.get<LevelItem[]>("/api/v1/admin/levels");
      setLevels(data);
      const formState: Record<string, LevelFormData> = {};
      for (const level of data) {
        formState[level.id] = levelToForm(level);
      }
      setForms(formState);
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

  const updateForm = (levelId: string, field: keyof LevelFormData, value: string | boolean) => {
    setForms((prev) => ({
      ...prev,
      [levelId]: { ...prev[levelId], [field]: value },
    }));
  };

  const changedLevels = levels.filter((l) => forms[l.id] && hasChanges(l, forms[l.id]));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      for (const level of changedLevels) {
        const form = forms[level.id];
        await api.put(`/api/v1/admin/levels/${level.id}`, {
          name: form.name,
          description: form.description || null,
          min_points: parseInt(form.min_points || "0"),
          max_points: form.max_points ? parseInt(form.max_points) : null,
          icon_url: form.icon_url || null,
          color: form.color || null,
          min_missions_completed: parseInt(form.min_missions_completed || "0"),
          min_referrals_active: parseInt(form.min_referrals_active || "0"),
          requires_approval: form.requires_approval,
        });
      }
      setSuccess(`${changedLevels.length} nível(is) atualizado(s) com sucesso!`);
      await loadLevels();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Níveis & Progressão</h1>
          <p className="text-subhead text-secondary">
            Configure os limiares de pontuação, missões e requisitos para cada nível
          </p>
        </div>
        {changedLevels.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            id="save-levels-btn"
          >
            {saving ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Salvando...
              </>
            ) : (
              <>
                <Save size={18} />
                Salvar Alterações ({changedLevels.length})
              </>
            )}
          </button>
        )}
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

      {/* Journey Visual — Level Cards */}
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
                const form = forms[level.id];
                const color = form?.color || level.color || "#6B7280";
                const changed = form && hasChanges(level, form);
                return (
                  <div key={level.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "var(--space-base) var(--space-lg)",
                        borderRadius: "var(--radius-lg)",
                        border: `2px solid ${changed ? "var(--color-warning)" : color}`,
                        background: `${color}10`,
                        minWidth: 140,
                        transition: "all var(--transition-fast)",
                        position: "relative",
                      }}
                    >
                      {changed && (
                        <div
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "var(--color-warning)",
                          }}
                        />
                      )}
                      <span style={{ fontSize: "1.75rem", marginBottom: "var(--space-xs)" }}>
                        {form?.icon_url || level.icon_url || "⭐"}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color,
                          textAlign: "center",
                        }}
                      >
                        {form?.name || level.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                          marginTop: "var(--space-xs)",
                        }}
                      >
                        {form?.min_points || level.min_points}
                        {(form?.max_points || level.max_points)
                          ? ` – ${form?.max_points || level.max_points} pts`
                          : "+ pts"}
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
        <div className="card-header">
          <h3
            className="text-headline"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}
          >
            <Trophy size={20} color="var(--color-primary)" />
            Configuração dos Níveis
          </h3>
        </div>

        {loading ? (
          <div className="card-body">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 60, marginBottom: "var(--space-sm)", borderRadius: "var(--radius-sm)" }}
              />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Ícone</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Cor</th>
                  <th style={{ textAlign: "center" }}>
                    <span title="Pontuação Mínima">Pts Mín</span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span title="Pontuação Máxima">Pts Máx</span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span title="Missões concluídas necessárias">
                      <Target size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Missões
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span title="Convites ativos necessários">
                      <Users size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Convites
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span title="Requer aprovação manual">
                      <Shield size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Aprovação
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => {
                  const form = forms[level.id];
                  if (!form) return null;
                  const changed = hasChanges(level, form);

                  return (
                    <tr
                      key={level.id}
                      style={{
                        background: changed ? "rgba(245, 158, 11, 0.04)" : undefined,
                        transition: "background var(--transition-fast)",
                      }}
                    >
                      {/* Order */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${form.color}20`,
                            color: form.color,
                            fontWeight: 700,
                          }}
                        >
                          {level.order_index}
                        </span>
                      </td>

                      {/* Icon — Emoji Picker */}
                      <td>
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            onClick={() => setOpenPickerId(openPickerId === level.id ? null : level.id)}
                            style={{
                              width: 48,
                              height: 48,
                              fontSize: "1.5rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `2px solid ${openPickerId === level.id ? "var(--color-primary)" : "var(--border-light)"}`,
                              borderRadius: "var(--radius-base)",
                              background: openPickerId === level.id ? "var(--color-primary-50)" : "var(--surface)",
                              cursor: "pointer",
                              transition: "all var(--transition-fast)",
                            }}
                            title="Escolher ícone"
                          >
                            {form.icon_url || "⭐"}
                          </button>

                          {/* Emoji Picker Dropdown */}
                          {openPickerId === level.id && (
                            <div
                              ref={pickerRef}
                              style={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                left: 0,
                                zIndex: 100,
                                width: 280,
                                background: "var(--surface)",
                                border: "1px solid var(--border-light)",
                                borderRadius: "var(--radius-lg)",
                                boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                                padding: "var(--space-sm)",
                                maxHeight: 320,
                                overflowY: "auto",
                              }}
                            >
                              {EMOJI_CATEGORIES.map((cat) => (
                                <div key={cat.label} style={{ marginBottom: "var(--space-xs)" }}>
                                  <div
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      color: "var(--text-tertiary)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      padding: "var(--space-xs) var(--space-xs)",
                                    }}
                                  >
                                    {cat.label}
                                  </div>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(5, 1fr)",
                                      gap: 2,
                                    }}
                                  >
                                    {cat.emojis.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          updateForm(level.id, "icon_url", emoji);
                                          setOpenPickerId(null);
                                        }}
                                        style={{
                                          width: "100%",
                                          aspectRatio: "1",
                                          fontSize: "1.25rem",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          border: form.icon_url === emoji ? "2px solid var(--color-primary)" : "1px solid transparent",
                                          borderRadius: "var(--radius-sm)",
                                          background: form.icon_url === emoji ? "var(--color-primary-50)" : "transparent",
                                          cursor: "pointer",
                                          transition: "all var(--transition-fast)",
                                        }}
                                        onMouseEnter={(e) => {
                                          if (form.icon_url !== emoji) {
                                            e.currentTarget.style.background = "var(--bg-hover)";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (form.icon_url !== emoji) {
                                            e.currentTarget.style.background = "transparent";
                                          }
                                        }}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td>
                        <input
                          className="input"
                          value={form.name}
                          onChange={(e) => updateForm(level.id, "name", e.target.value)}
                          style={{ minWidth: 130, fontWeight: 600 }}
                        />
                      </td>

                      {/* Description */}
                      <td>
                        <input
                          className="input"
                          value={form.description}
                          onChange={(e) => updateForm(level.id, "description", e.target.value)}
                          style={{ minWidth: 200 }}
                          placeholder="Descrição do nível..."
                        />
                      </td>

                      {/* Color */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)" }}>
                          <input
                            type="color"
                            value={form.color}
                            onChange={(e) => updateForm(level.id, "color", e.target.value)}
                            style={{
                              width: 32,
                              height: 32,
                              padding: 0,
                              border: "1px solid var(--border-light)",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              background: "transparent",
                            }}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                            {form.color}
                          </span>
                        </div>
                      </td>

                      {/* Min Points */}
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={form.min_points}
                          onChange={(e) => updateForm(level.id, "min_points", e.target.value)}
                          style={{ width: 90, textAlign: "center" }}
                        />
                      </td>

                      {/* Max Points */}
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={form.max_points}
                          onChange={(e) => updateForm(level.id, "max_points", e.target.value)}
                          style={{ width: 90, textAlign: "center" }}
                          placeholder="∞"
                        />
                      </td>

                      {/* Min Missions */}
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={form.min_missions_completed}
                          onChange={(e) => updateForm(level.id, "min_missions_completed", e.target.value)}
                          style={{ width: 80, textAlign: "center" }}
                        />
                      </td>

                      {/* Min Referrals */}
                      <td>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={form.min_referrals_active}
                          onChange={(e) => updateForm(level.id, "min_referrals_active", e.target.value)}
                          style={{ width: 80, textAlign: "center" }}
                        />
                      </td>

                      {/* Requires Approval */}
                      <td style={{ textAlign: "center" }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--space-xs)",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={form.requires_approval}
                            onChange={(e) => updateForm(level.id, "requires_approval", e.target.checked)}
                            style={{
                              width: 18,
                              height: 18,
                              accentColor: "var(--color-primary)",
                              cursor: "pointer",
                            }}
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
          <li>Níveis com <strong>"Aprovação"</strong> marcada exigem aprovação manual de um admin antes da promoção.</li>
          <li>Os campos <strong>Slug</strong> e <strong>Ordem</strong> são fixos para manter a integridade da jornada.</li>
          <li>Alterações nos limiares afetam <strong>novos avanços</strong> — usuários já promovidos mantêm seu nível.</li>
        </ul>
      </div>
    </div>
  );
}
