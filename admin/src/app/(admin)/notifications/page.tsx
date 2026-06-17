"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Bell, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function NotificationsPage() {
  const { hasPermission } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSend = async () => {
    setInfo("Funcionalidade ainda não implementada");
    setTimeout(() => setInfo(""), 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div>
        <h1 className="text-title-2">Notificações</h1>
        <p className="text-subhead text-secondary">Enviar notificações para os embaixadores</p>
      </div>

      {/* Send Notification */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-headline" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
            <Bell size={20} color="var(--color-primary)" />
            Enviar Notificação
          </h3>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
          {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
          {info && <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-md) var(--space-lg)", background: "var(--color-primary-50)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "var(--color-primary-dark)" }}>{info}</div>}

          <div className="form-group">
            <label htmlFor="notif-title" className="label">Título</label>
            <input
              id="notif-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da notificação"
            />
          </div>
          <div className="form-group">
            <label htmlFor="notif-body" className="label">Mensagem</label>
            <textarea
              id="notif-body"
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Corpo da notificação"
              rows={4}
              style={{ resize: "vertical", minHeight: 100 }}
            />
          </div>
          <div>
            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || !title || !body}
              id="send-notification-btn"
            >
              <Send size={16} />
              {sending ? "Enviando..." : "Enviar para Todos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
