"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScrollText, AlertTriangle, Search } from "lucide-react";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div>
        <h1 className="text-title-2">Auditoria</h1>
        <p className="text-subhead text-secondary">Registro de todas as ações administrativas</p>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>ID</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhum log encontrado
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </td>
                <td><span className="badge badge-primary">{log.action}</span></td>
                <td style={{ fontWeight: 500 }}>{log.entity_type}</td>
                <td>
                  <code style={{
                    background: "var(--surface-elevated)",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                  }}>
                    {log.entity_id ? log.entity_id.substring(0, 8) : "—"}
                  </code>
                </td>
                <td style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                  {log.ip_address || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
