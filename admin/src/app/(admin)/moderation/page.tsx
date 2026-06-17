"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ModerationItem {
  id: string;
  status: string;
  submitted_at: string;
  evidence_url: string | null;
  notes: string | null;
  mission: { title: string; points_reward: number };
  user: { full_name: string; email: string };
}

interface ModerationResponse {
  pending_verifications: { items: ModerationItem[]; total: number };
  suspicious_activity: unknown[];
}

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const data = await api.get<ModerationResponse>("/api/v1/admin/moderation/queue");
      setItems(data.pending_verifications?.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar fila");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div>
        <h1 className="text-title-2">Moderação</h1>
        <p className="text-subhead text-secondary">Fila de missões pendentes de verificação</p>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-lg)" }} />
        ))
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-3xl)", textAlign: "center" }}>
          <CheckCircle size={48} style={{ margin: "0 auto var(--space-base)", color: "var(--color-success)", opacity: 0.5 }} />
          <h3 className="text-headline" style={{ marginBottom: "var(--space-xs)" }}>Fila vazia</h3>
          <p className="text-subhead text-secondary">Todas as submissões foram moderadas</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Missão</th>
                <th>Enviado em</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 500 }}>{item.user?.full_name || "—"}</span>
                      <br />
                      <span className="text-caption text-secondary">{item.user?.email}</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span>{item.mission?.title || "—"}</span>
                      <br />
                      <span className="badge badge-warning" style={{ marginTop: 4 }}>{item.mission?.points_reward} pts</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td style={{ color: "var(--text-tertiary)", maxWidth: 200 }}>
                    {item.notes || "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                      <button className="btn btn-sm" style={{ background: "var(--color-success)", color: "white" }}>
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button className="btn btn-sm btn-outline" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

