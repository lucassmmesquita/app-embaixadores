"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, AlertTriangle, Shield, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";

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
  const [success, setSuccess] = useState("");
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await api.post(`/api/v1/admin/moderation/${selectedItem.id}/${action}`);
      showMessage(`Submissão ${action === "approve" ? "aprovada" : "rejeitada"} com sucesso ✓`);
      setSelectedItem(null);
      loadQueue();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || `Erro ao ${action === "approve" ? "aprovar" : "rejeitar"}`, true);
    } finally {
      setActionLoading(false);
    }
  };

  const moderationColumns: Column<ModerationItem>[] = [
    {
      key: "id",
      label: "Usuário",
      primary: true,
      render: (_val, row) => <span style={{ fontWeight: 500 }}>{row.user?.full_name || "—"}</span>,
    },
    {
      key: "status",
      label: "Missão",
      render: (_val, row) => <span style={{ color: "var(--text-secondary)" }}>{row.mission?.title || "—"}</span>,
    },
    {
      key: "submitted_at",
      label: "Enviado em",
      sortable: true,
      hideOnMobile: true,
      render: (val) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {val ? new Date(String(val)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
          {val && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: 4 }}>
              {new Date(String(val)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <Link href="/missions" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.8125rem", color: "var(--text-secondary)", textDecoration: "none", marginBottom: "var(--space-xs)" }}>
            <ArrowLeft size={14} />
            Voltar para Missões
          </Link>
          <h1 className="text-title-2">Moderação</h1>
          <p className="text-subhead text-secondary">Fila de missões pendentes de verificação</p>
        </div>
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      {!loading && items.length === 0 ? (
        <div className="card" style={{ padding: "var(--space-3xl)", textAlign: "center" }}>
          <CheckCircle size={48} style={{ margin: "0 auto var(--space-base)", color: "var(--color-success)", opacity: 0.5 }} />
          <h3 className="text-headline" style={{ marginBottom: "var(--space-xs)" }}>Fila vazia</h3>
          <p className="text-subhead text-secondary">Todas as submissões foram moderadas</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <DataTable
            columns={moderationColumns}
            data={items}
            loading={loading}
            emptyMessage="Nenhuma submissão pendente"
            emptyIcon={<CheckCircle size={32} />}
            onRowClick={(row) => setSelectedItem(row)}
            defaultSortKey="submitted_at"
            defaultSortDirection="desc"
            id="moderation-table"
          />
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Detalhes da Submissão"
        icon={<Shield size={20} color="var(--color-primary)" />}
        size="md"
        id="moderation-detail-modal"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setSelectedItem(null)} disabled={actionLoading}>
              Cancelar
            </button>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button
                className="btn"
                style={{ background: "var(--color-danger)", color: "white" }}
                onClick={() => handleAction("reject")}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Rejeitar
              </button>
              <button
                className="btn"
                style={{ background: "var(--color-success)", color: "white" }}
                onClick={() => handleAction("approve")}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Aprovar
              </button>
            </div>
          </>
        }
      >
        {selectedItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="label">Usuário</label>
                <div className="input" style={{ background: "var(--bg-hover)", cursor: "default", fontWeight: 500 }}>{selectedItem.user?.full_name || "—"}</div>
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>{selectedItem.user?.email || "—"}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Missão</label>
              <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>{selectedItem.mission?.title || "—"}</div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="label">Pontos da Missão</label>
                <div className="input" style={{ background: "var(--bg-hover)", cursor: "default", fontWeight: 600 }}>{selectedItem.mission?.points_reward || 0} pontos</div>
              </div>

              <div className="form-group">
                <label className="label">Enviado em</label>
                <div className="input" style={{ background: "var(--bg-hover)", cursor: "default" }}>
                  {selectedItem.submitted_at
                    ? new Date(selectedItem.submitted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) +
                      " " +
                      new Date(selectedItem.submitted_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </div>
              </div>
            </div>

            {selectedItem.notes && (
              <div className="form-group">
                <label className="label">Observações</label>
                <div className="input" style={{ background: "var(--bg-hover)", cursor: "default", whiteSpace: "pre-wrap" }}>{selectedItem.notes}</div>
              </div>
            )}

            {selectedItem.evidence_url && (
              <div className="form-group">
                <label className="label">Evidência</label>
                <a href={selectedItem.evidence_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }}>
                  Ver Evidência
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
