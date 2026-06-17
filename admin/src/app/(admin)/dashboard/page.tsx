"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Users,
  UserPlus,
  Target,
  Zap,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";

interface DashboardStats {
  total_users: number;
  new_users_week: number;
  total_points_awarded: number;
  missions_completed: number;
  total_events: number;
  active_missions: number;
  users_per_level: { level_name: string; level_color: string; count: number }[];
  pending_approvals: number;
  pending_verifications: number;
}

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get<DashboardStats>("/api/v1/admin/dashboard/stats");
      setStats(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-base)" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Total de Usuários",
      value: stats.total_users.toLocaleString("pt-BR"),
      icon: <Users size={22} />,
      color: "var(--color-primary)",
      bg: "var(--color-primary-50)",
    },
    {
      label: "Novos esta Semana",
      value: `+${stats.new_users_week}`,
      icon: <UserPlus size={22} />,
      color: "var(--color-success)",
      bg: "var(--color-success-light)",
    },
    {
      label: "Missões Concluídas",
      value: stats.missions_completed.toLocaleString("pt-BR"),
      icon: <Target size={22} />,
      color: "var(--level-mobilizador)",
      bg: "var(--color-info-light)",
    },
    {
      label: "Pontos Distribuídos",
      value: stats.total_points_awarded.toLocaleString("pt-BR"),
      icon: <Zap size={22} />,
      color: "#8B6914",
      bg: "var(--color-warning-light)",
    },
    {
      label: "Eventos Ativos",
      value: stats.total_events.toString(),
      icon: <Calendar size={22} />,
      color: "var(--level-coordenador)",
      bg: "#F3E8FF",
    },
    {
      label: "Missões Ativas",
      value: stats.active_missions.toString(),
      icon: <TrendingUp size={22} />,
      color: "var(--color-primary-dark)",
      bg: "var(--color-primary-100)",
    },
  ];

  const totalLevelUsers = stats.users_per_level.reduce((sum, l) => sum + l.count, 0) || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* ═══ STAT CARDS ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "var(--space-base)",
      }}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="stat-card__icon" style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-card__value">{card.value}</div>
            <div className="stat-card__label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ PENDÊNCIAS ═══ */}
      {(stats.pending_approvals > 0 || stats.pending_verifications > 0) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-base)",
        }}>
          {stats.pending_approvals > 0 && (
            <div className="alert alert-warning" style={{ padding: "var(--space-base)" }}>
              <Clock size={20} />
              <div>
                <strong>{stats.pending_approvals}</strong> aprovação(ões) de nível pendente(s)
              </div>
            </div>
          )}
          {stats.pending_verifications > 0 && (
            <div className="alert alert-info" style={{ padding: "var(--space-base)" }}>
              <AlertTriangle size={20} />
              <div>
                <strong>{stats.pending_verifications}</strong> missão(ões) aguardando verificação
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ FUNIL DE NÍVEIS ═══ */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-headline">Distribuição por Nível</h3>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {stats.users_per_level.map((level) => {
              const percentage = (level.count / totalLevelUsers) * 100;
              return (
                <div key={level.level_name} style={{ display: "flex", alignItems: "center", gap: "var(--space-base)" }}>
                  <div style={{
                    width: 120,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: level.level_color || "var(--text)",
                    flexShrink: 0,
                  }}>
                    {level.level_name}
                  </div>
                  <div style={{
                    flex: 1,
                    height: 28,
                    background: "var(--surface-elevated)",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.max(percentage, 2)}%`,
                      background: level.level_color || "var(--color-primary)",
                      borderRadius: "var(--radius-pill)",
                      transition: "width 0.6s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "var(--space-sm)",
                    }}>
                      {percentage > 10 && (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "white",
                        }}>
                          {level.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    width: 60,
                    textAlign: "right",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    flexShrink: 0,
                  }}>
                    {level.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
