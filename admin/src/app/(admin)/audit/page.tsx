"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScrollText, AlertTriangle } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await api.get<{ items: AuditLog[] }>("/api/v1/admin/audit-logs?limit=100");
      setLogs(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const auditColumns: Column<AuditLog>[] = [
    {
      key: "created_at",
      label: "Data/Hora",
      sortable: true,
      render: (val) => (
        <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          {new Date(String(val)).toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      key: "action",
      label: "Ação",
      sortable: true,
      primary: true,
      render: (val) => <span className="badge badge-primary">{String(val)}</span>,
    },
    {
      key: "entity_type",
      label: "Entidade",
      sortable: true,
      render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span>,
    },
    {
      key: "entity_id",
      label: "ID",
      hideOnMobile: true,
      render: (val) => (
        <code style={{
          background: "var(--surface-elevated)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.75rem",
        }}>
          {val ? String(val).substring(0, 8) : "—"}
        </code>
      ),
    },
    {
      key: "ip_address",
      label: "IP",
      hideOnMobile: true,
      render: (val) => <span style={{ color: "var(--text-tertiary)" }}>{val ? String(val) : "—"}</span>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Auditoria</h1>
          <p className="text-subhead text-secondary">Registro de todas as ações administrativas</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={auditColumns}
          data={logs}
          loading={loading}
          emptyMessage="Nenhum log encontrado"
          emptyIcon={<ScrollText size={32} />}
          defaultSortKey="created_at"
          defaultSortDirection="desc"
          id="audit-table"
        />
      </div>
    </div>
  );
}
