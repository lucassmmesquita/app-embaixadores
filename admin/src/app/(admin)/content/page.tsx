"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, FileText, AlertTriangle, ExternalLink } from "lucide-react";

interface Content {
  id: string;
  title: string;
  content_type: string;
  category: string | null;
  is_featured: boolean;
  total_shares: number;
  points_per_share: number;
  is_active: boolean;
  created_at: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const data = await api.get<{ items: Content[] }>("/api/v1/content?page_size=50");
      setItems(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Conteúdo</h1>
          <p className="text-subhead text-secondary">{items.length} material(is)</p>
        </div>
        <button className="btn btn-primary" id="create-content-btn" onClick={() => { setInfo("Funcionalidade ainda não implementada"); setTimeout(() => setInfo(""), 3000); }}>
          <Plus size={18} />
          Novo Conteúdo
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-md) var(--space-lg)", background: "var(--color-primary-50)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "var(--color-primary-dark)" }}>{info}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-base)" }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
          ))
        ) : items.map((item) => (
          <div key={item.id} className="card" style={{ padding: "var(--space-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <FileText size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>{item.title}</h3>
              </div>
              <span className={`badge ${item.is_active ? "badge-success" : "badge-neutral"}`}>
                {item.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-sm)" }}>
              <span className="badge badge-info">{item.content_type}</span>
              {item.is_featured && <span className="badge badge-warning">Destaque</span>}
              {item.category && <span className="badge badge-neutral">{item.category}</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              <span>{item.total_shares} compartilhamentos</span>
              <span>{item.points_per_share} pts/share</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
