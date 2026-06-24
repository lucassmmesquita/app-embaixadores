"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Bell, Send, AlertTriangle, CheckCircle2, Users,
  Eye, Clock, X, ChevronDown, ChevronUp,
} from "lucide-react";

interface NotificationBatch {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  sent_at: string;
  sent_count: number;
  read_count: number;
}

const NOTIFICATION_TYPES = [
  { value: "info", label: "Informação", color: "var(--color-info)" },
  { value: "campaign", label: "Campanha", color: "var(--color-primary)" },
  { value: "event", label: "Evento", color: "var(--level-mobilizador)" },
  { value: "mission", label: "Missão", color: "var(--color-warning)" },
  { value: "system", label: "Sistema", color: "var(--text-tertiary)" },
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ═══ SEND FORM STATE ═══
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { loadNotifications(); }, []);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Notificações</h1>
          <p className="text-subhead text-secondary">
            {notifications.length} envio(s) registrado(s)
          </p>
        </div>
        <button
          className="btn btn-primary"
          id="new-notification-btn"
          onClick={() => setShowForm(true)}
        >
          <Send size={18} />
          Nova Notificação
        </button>
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      {/* ═══ SEND MODAL ═══ */}
      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !confirmOpen && setShowForm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 560, width: "95%", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="text-headline" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <Bell size={20} color="var(--color-primary)" />
                Nova Notificação
              </h3>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
              <div className="form-group">
                <label htmlFor="notif-type" className="label">Tipo</label>
                <select
                  id="notif-type"
                  className="input"
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notif-title" className="label">Título</label>
                <input
                  id="notif-title"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nova missão disponível! 🎯"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notif-body" className="label">Mensagem</label>
                <textarea
                  id="notif-body"
                  className="input"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escreva a mensagem da notificação..."
                  rows={4}
                  style={{ resize: "vertical", minHeight: 100 }}
                />
              </div>

              {/* Preview */}
              {canSend && (
                <div style={{
                  padding: "var(--space-md)",
                  background: "var(--color-bg-tertiary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                }}>
                  <p className="text-caption-1 text-tertiary" style={{ marginBottom: "var(--space-xs)" }}>
                    Prévia da notificação
                  </p>
                  <p className="text-headline" style={{ marginBottom: "var(--space-xs)" }}>{title}</p>
                  <p className="text-subhead text-secondary">{body}</p>
                </div>
              )}

              <p className="text-caption-1 text-tertiary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={14} /> Será enviada para todos os embaixadores ativos
              </p>
            </div>

            <div className="card-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", padding: "var(--space-base) var(--space-lg)" }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
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
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOTIFICATION HISTORY TABLE ═══ */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Notificação</th>
              <th>Tipo</th>
              <th>Enviada em</th>
              <th>Destinatários</th>
              <th>Lidas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhuma notificação enviada ainda.
                </td>
              </tr>
            ) : notifications.map((notif) => {
              const isExpanded = expandedId === notif.id;
              const readPct = notif.sent_count > 0
                ? Math.round((notif.read_count / notif.sent_count) * 100)
                : 0;

              return (
                <tr key={notif.id} style={{ cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : notif.id)}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{notif.title}</div>
                      {isExpanded && (
                        <div className="text-subhead text-secondary" style={{
                          marginTop: "var(--space-sm)",
                          padding: "var(--space-sm) var(--space-md)",
                          background: "var(--color-bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          whiteSpace: "pre-wrap",
                        }}>
                          {notif.body}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{typeBadge(notif.notification_type)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
                      <Clock size={14} />
                      {new Date(notif.sent_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric"
                      })}
                    </div>
                    <div className="text-caption-1 text-tertiary">
                      {new Date(notif.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={14} color="var(--text-tertiary)" />
                      <span style={{ fontWeight: 600 }}>{notif.sent_count}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Eye size={14} color="var(--text-tertiary)" />
                      <span>{notif.read_count}</span>
                      <span className="text-caption-1 text-tertiary">({readPct}%)</span>
                    </div>
                    {/* Read progress bar */}
                    <div style={{
                      marginTop: 4,
                      height: 4,
                      width: 60,
                      borderRadius: 2,
                      background: "var(--color-bg-tertiary)",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${readPct}%`,
                        borderRadius: 2,
                        background: readPct > 50 ? "var(--color-success)" : "var(--color-warning)",
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  </td>
                  <td>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ═══ CONFIRM MODAL ═══ */}
      {confirmOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 420, width: "90%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 className="text-headline">Confirmar Envio</h3>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
              <p className="text-body">
                Você está prestes a enviar esta notificação para <strong>todos os embaixadores ativos</strong>. Deseja continuar?
              </p>
              <div style={{
                padding: "var(--space-md)",
                background: "var(--color-bg-tertiary)",
                borderRadius: "var(--radius-md)",
              }}>
                <p className="text-headline">{title}</p>
                <p className="text-subhead text-secondary">{body}</p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleSend}>
                  <Send size={16} /> Confirmar Envio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
