"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Bell, Send, AlertTriangle, CheckCircle2, Users,
  Settings, Flag, Trash2,
  TrendingUp, Award, Calendar, UserPlus, Loader2,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

interface HistoryEntry {
  action: string;
  label: string;
  admin_name: string;
  created_at: string;
}

interface NotificationBatch {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  sent_at: string;
  sent_count: number;
  read_count: number;
  is_deleted: boolean;
}

interface SystemConfig {
  event_key: string;
  label: string;
  description: string;
  title_template: string;
  body_template: string;
  notification_type: string;
  is_active: boolean;
}

const SYSTEM_CONFIG_ICONS: Record<string, typeof Bell> = {
  mission_completed: Flag,
  level_up: TrendingUp,
  badge_awarded: Award,
  event_checkin: Calendar,
  new_event: Calendar,
  invite_accepted: UserPlus,
};

const NOTIFICATION_TYPES = [
  { value: "info", label: "Informação", color: "var(--color-info)" },
  { value: "campaign", label: "Campanha", color: "var(--color-primary)" },
  { value: "event", label: "Evento", color: "var(--level-mobilizador)" },
  { value: "mission", label: "Missão", color: "var(--color-warning)" },
  { value: "system", label: "Sistema", color: "var(--text-tertiary)" },
  { value: "level_up", label: "Nível", color: "var(--color-success)" },
  { value: "badge", label: "Conquista", color: "var(--color-warning)" },
  { value: "invite", label: "Convite", color: "var(--color-info)" },
];

function typeBadge(type: string) {
  const t = NOTIFICATION_TYPES.find(n => n.value === type);
  return (
    <span
      className="badge"
      style={{
        background: `${t?.color || "var(--text-tertiary)"}18`,
        color: t?.color || "var(--text-tertiary)",
        border: `1px solid ${t?.color || "var(--text-tertiary)"}30`,
      }}
    >
      {t?.label || type}
    </span>
  );
}

export default function NotificationsPage() {
  // ═══ LIST STATE ═══
  const [notifications, setNotifications] = useState<NotificationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<NotificationBatch | null>(null);

  // ═══ SEND FORM STATE ═══
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationBatch | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ═══ SYSTEM CONFIGS STATE ═══
  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // ═══ TAB STATE ═══
  const [activeTab, setActiveTab] = useState<"sent" | "system">("sent");

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    if (selectedNotification) {
      setLoadingHistory(true);
      setHistory([]);
      api.get<{ history: HistoryEntry[] }>(`/api/v1/admin/notifications/${selectedNotification.id}/history`)
        .then(data => setHistory(data.history || []))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [selectedNotification]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: NotificationBatch[] }>(
        "/api/v1/admin/notifications?page_size=50"
      );
      setNotifications(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);

    try {
      const result = await api.post<{ message: string; sent_count: number }>(
        "/api/v1/admin/notifications/send",
        { title, body, notification_type: notificationType }
      );
      showMessage(result.message);
      setTitle("");
      setBody("");
      setNotificationType("info");
      setShowForm(false);
      loadNotifications();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao enviar notificação", true);
    } finally {
      setSending(false);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const confirmDelete = (notif: NotificationBatch) => {
    setSelectedNotification(null);
    setNotificationToDelete(notif);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!notificationToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/admin/notifications/${notificationToDelete.id}`);
      showMessage("Notificação excluída com sucesso");
      setDeleteConfirmOpen(false);
      setNotificationToDelete(null);
      loadNotifications();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao excluir notificação", true);
    } finally {
      setDeleting(false);
    }
  };

  const loadSystemConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const data = await api.get<SystemConfig[]>("/api/v1/admin/notifications/system-configs");
      setSystemConfigs(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao carregar configurações", true);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleToggle = async (eventKey: string, currentActive: boolean) => {
    setTogglingKey(eventKey);
    try {
      await api.patch(
        `/api/v1/admin/notifications/system-configs/${eventKey}?is_active=${!currentActive}`
      );
      setSystemConfigs((prev) =>
        prev.map((c) => c.event_key === eventKey ? { ...c, is_active: !currentActive } : c)
      );
      showMessage(`Notificação ${!currentActive ? "ativada" : "desativada"} com sucesso`);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar configuração", true);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleTabChange = (tab: "sent" | "system") => {
    setActiveTab(tab);
    if (tab === "system" && systemConfigs.length === 0) loadSystemConfigs();
  };

  const tabStyle = (tab: string) => ({
    padding: "var(--space-sm) var(--space-base)",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
    background: "none",
    cursor: "pointer" as const,
    fontWeight: activeTab === tab ? 600 : 400,
    color: activeTab === tab ? "var(--color-primary)" : "var(--text-secondary)",
    fontSize: 14,
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: 6,
  });

  const sentColumns: Column<NotificationBatch>[] = [
    { key: "title", label: "Notificação", sortable: true, primary: true, render: (val, row) => (
      <span style={{ fontWeight: 500, opacity: row.is_deleted ? 0.5 : 1 }}>
        {String(val)}
        {row.is_deleted && (
          <span style={{ marginLeft: 8, background: "rgba(220,38,38,0.1)", color: "var(--color-error)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4 }}>Excluída</span>
        )}
      </span>
    )},
    { key: "sent_at", label: "Enviada em", sortable: true, render: (val) => (
      <span style={{ color: "var(--text-secondary)" }}>
        {new Date(String(val)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: 4 }}>
          {new Date(String(val)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </span>
    )},
    { key: "sent_count", label: "Destinatários", sortable: true, align: "right", render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span> },
    { key: "read_count", label: "Lidas", sortable: true, align: "right", hideOnMobile: true, render: (_val, row) => {
      const pct = row.sent_count > 0 ? Math.round((row.read_count / row.sent_count) * 100) : 0;
      return <span>{row.read_count} <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>({pct}%)</span></span>;
    }},
    { key: "id", label: "", render: (_val, row) => row.is_deleted ? null : (
      <button
        className="btn btn-icon"
        style={{ color: "var(--text-tertiary)", padding: 4, minWidth: "auto" }}
        title="Excluir notificação"
        onClick={(e) => { e.stopPropagation(); confirmDelete(row); }}
      >
        <Trash2 size={16} />
      </button>
    )},
  ];

  const systemColumns: Column<SystemConfig>[] = [
    { key: "label", label: "Notificação", sortable: true, primary: true, render: (_val, row) => (
      <div><div style={{ fontWeight: 600 }}>{row.label}</div><div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{row.description}</div></div>
    )},
    { key: "notification_type", label: "Tipo", sortable: true, hideOnMobile: true, render: (val) => <span style={{ color: "var(--text-secondary)" }}>{NOTIFICATION_TYPES.find(t => t.value === val)?.label || String(val)}</span> },
    { key: "is_active", label: "Status", sortable: true, render: (_val, row) => (
      <label className="toggle" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={!!row.is_active} onChange={() => handleToggle(row.event_key, row.is_active)} />
        <div className="toggle__track" /><div className="toggle__thumb" />
      </label>
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Notificações</h1>
          <p className="text-subhead text-secondary">Gerencie notificações enviadas e automáticas</p>
        </div>
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      {/* ═══ TABS ═══ */}
      <div style={{ display: "flex", gap: "var(--space-sm)", borderBottom: "1px solid var(--color-border)" }}>
        <button style={tabStyle("sent")} onClick={() => handleTabChange("sent")}>
          <Send size={16} /> Enviadas
        </button>
        <button style={tabStyle("system")} onClick={() => handleTabChange("system")}>
          <Settings size={16} /> Sistema
        </button>
      </div>

      {/* ═══ TAB: ENVIADAS ═══ */}
      {activeTab === "sent" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-primary"
              id="new-notification-btn"
              onClick={() => setShowForm(true)}
            >
              <Send size={18} />
              Nova Notificação
            </button>
          </div>
          <Modal
            open={showForm}
            onClose={() => setShowForm(false)}
            title="Nova Notificação"
            icon={<Bell size={20} color="var(--color-primary)" />}
            size="md"
            id="notification-modal"
            footer={
              <>
                <button className="btn btn-outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={sending || !canSend}
                  id="send-notification-btn"
                >
                  <Send size={16} />
                  {sending ? "Enviando..." : "Enviar para Todos"}
                </button>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
              <div className="form-group">
                <label htmlFor="notif-title" className="label">Título</label>
                <input id="notif-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Nova missão disponível!" />
              </div>

              <div className="form-group">
                <label htmlFor="notif-body" className="label">Mensagem</label>
                <textarea id="notif-body" className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva a mensagem da notificação..." rows={4} style={{ resize: "vertical", minHeight: 100 }} />
              </div>

              {canSend && (
                <div style={{ padding: "var(--space-md)", background: "var(--color-bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <p className="text-caption-1 text-tertiary" style={{ marginBottom: "var(--space-xs)" }}>Prévia da notificação</p>
                  <p className="text-headline" style={{ marginBottom: "var(--space-xs)" }}>{title}</p>
                  <p className="text-subhead text-secondary">{body}</p>
                </div>
              )}

              <p className="text-caption-1 text-tertiary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={14} /> Será enviada para todos os embaixadores ativos
              </p>
            </div>
          </Modal>

          {/* NOTIFICATION HISTORY TABLE */}
          <div className="card" style={{ overflow: "hidden" }}>
            <DataTable columns={sentColumns} data={notifications} loading={loading} emptyMessage="Nenhuma notificação enviada ainda." emptyIcon={<Bell size={32} />} onRowClick={(row) => setSelectedNotification(row)} defaultSortKey="sent_at" defaultSortDirection="desc" id="notifications-sent-table" />
          </div>

          {/* Detail Modal (read-only) */}
          <Modal
            open={!!selectedNotification}
            onClose={() => setSelectedNotification(null)}
            title="Detalhes da Notificação"
            icon={<Bell size={20} color="var(--color-primary)" />}
            size="md"
            id="notification-detail-modal"
            footer={
              <>
                {selectedNotification && !selectedNotification.is_deleted && (
                  <button
                    className="btn btn-outline"
                    style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
                    onClick={() => confirmDelete(selectedNotification)}
                    disabled={deleting}
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => setSelectedNotification(null)}>
                  Fechar
                </button>
              </>
            }
          >
            {selectedNotification && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
                {selectedNotification.is_deleted && (
                  <div style={{ padding: "8px 12px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <Trash2 size={14} color="var(--color-error)" />
                    <span style={{ color: "var(--color-error)", fontSize: "0.8125rem", fontWeight: 500 }}>Esta notificação foi excluída e não é mais visível para os embaixadores</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="label">Título</label>
                  <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>{selectedNotification.title}</div>
                </div>

                <div className="form-group">
                  <label className="label">Mensagem</label>
                  <div className="input" style={{ background: "var(--bg-hover)", cursor: "default", whiteSpace: "pre-wrap" }}>{selectedNotification.body}</div>
                </div>

                <div className="form-group">
                  <label className="label">Enviada em</label>
                  <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>
                    {new Date(selectedNotification.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}{" "}
                    {new Date(selectedNotification.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="label">Destinatários</label>
                    <div className="input" style={{ background: "var(--bg-hover)", cursor: "default", fontWeight: 600 }}>{selectedNotification.sent_count}</div>
                  </div>

                  <div className="form-group">
                    <label className="label">Lidas</label>
                    <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>
                      {selectedNotification.read_count}{" "}
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
                        ({selectedNotification.sent_count > 0 ? Math.round((selectedNotification.read_count / selectedNotification.sent_count) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ═══ AUDIT HISTORY ═══ */}
                <div style={{ borderTop: "1px solid var(--separator)", paddingTop: "var(--space-base)", marginTop: "var(--space-sm)" }}>
                  <label className="label" style={{ marginBottom: "var(--space-sm)" }}>Histórico</label>
                  {loadingHistory ? (
                    <p className="text-caption-1 text-tertiary">Carregando...</p>
                  ) : history.length === 0 ? (
                    <p className="text-caption-1 text-tertiary">Sem registros de histórico</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {history.map((h, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                            background: h.action === "delete_notification" ? "var(--color-error)" : "var(--color-success)",
                          }} />
                          <div>
                            <p className="text-body" style={{ fontSize: "0.8125rem" }}>
                              <strong>{h.label}</strong> por {h.admin_name}
                            </p>
                            <p className="text-caption-1 text-tertiary">
                              {new Date(h.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                              {new Date(h.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* ═══ TAB: SISTEMA ═══ */}
      {activeTab === "system" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <DataTable columns={systemColumns} data={systemConfigs} loading={loadingConfigs} emptyMessage="Nenhuma configuração encontrada" emptyIcon={<Settings size={32} />} defaultSortKey="label" id="notifications-system-table" />
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar Envio"
        icon={<Send size={20} color="var(--color-primary)" />}
        size="sm"
        id="confirm-modal"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSend}>
              <Send size={16} /> Confirmar Envio
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          <p className="text-body">
            Você está prestes a enviar esta notificação para <strong>todos os embaixadores ativos</strong>. Deseja continuar?
          </p>
          <div style={{ padding: "var(--space-md)", background: "var(--color-bg-tertiary)", borderRadius: "var(--radius-md)" }}>
            <p className="text-headline">{title}</p>
            <p className="text-subhead text-secondary">{body}</p>
          </div>
        </div>
      </Modal>

      {/* ═══ DELETE CONFIRMATION ═══ */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Excluir Notificação"
        icon={<Trash2 size={20} color="var(--color-error)" />}
        size="md"
        id="delete-confirm-modal"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={16} />
              {deleting ? "Excluindo..." : "Confirmar Exclusão"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          <p className="text-body">
            Deseja excluir esta notificação? Ela será removida para <strong>todos os embaixadores</strong>.
          </p>
          {notificationToDelete && (
            <div style={{ padding: "var(--space-md)", background: "var(--color-bg-tertiary)", borderRadius: "var(--radius-md)" }}>
              <p className="text-headline">{notificationToDelete.title}</p>
              <p className="text-subhead text-secondary">{notificationToDelete.body}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
