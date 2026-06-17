"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Target, AlertTriangle } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string;
  action_type: string;
  points_reward: number;
  is_active: boolean;
  recurrence: string;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const data = await api.get<{ items: Mission[] }>("/api/v1/missions?page_size=50");
      setMissions(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar missões");
    } finally {
      setLoading(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    INVITE: "Convite",
    EVENT_ATTENDANCE: "Evento",
    CONTENT_SHARE: "Compartilhamento",
    ORGANIZE_MEETUP: "Encontro",
    SPREAD_PROPOSAL: "Proposta",
    COLLECT_DEMAND: "Demanda",
    TRAINING: "Formação",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Missões</h1>
          <p className="text-subhead text-secondary">{missions.length} missão(ões)</p>
        </div>
        <button className="btn btn-primary" id="create-mission-btn" onClick={() => { setInfo("Funcionalidade ainda não implementada"); setTimeout(() => setInfo(""), 3000); }}>
          <Plus size={18} />
          Nova Missão
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-md) var(--space-lg)", background: "var(--color-primary-50)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "var(--color-primary-dark)" }}>{info}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-base)" }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
          ))
        ) : missions.map((mission) => (
          <div key={mission.id} className="card" style={{ padding: "var(--space-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <Target size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{mission.title}</h3>
              </div>
              <span className={`badge ${mission.is_active ? "badge-success" : "badge-neutral"}`}>
                {mission.is_active ? "Ativa" : "Inativa"}
              </span>
            </div>
            <p className="text-caption" style={{ marginBottom: "var(--space-md)" }}>{mission.description}</p>
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <span className="badge badge-info">{TYPE_LABELS[mission.action_type] || mission.action_type}</span>
              <span className="badge badge-warning">{mission.points_reward} pts</span>
              <span className="badge badge-neutral">{mission.recurrence}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
