"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle, TrendingUp, Users, Zap, UserPlus, FileSpreadsheet } from "lucide-react";
import styles from "./dashboard.module.css";

interface DashboardV2Data {
  insight: {
    status: "success" | "warning" | "danger";
    title: string;
    message: string;
  };
  kpis: {
    total_users: number;
    new_users_week: number;
    activation_rate: number;
    viral_coef: number;
    avg_points: number;
  };
  funnel: {
    name: string;
    count: number;
    color: string;
  }[];
  providers: {
    name: string;
    count: number;
  }[];
  pies: {
    missions: Record<string, number>;
    events: Record<string, number>;
    materials: {
      shared: number;
      not_shared: number;
    };
  };
  trend: number[];
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<DashboardV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get<DashboardV2Data>(`/api/v1/admin/dashboard/v2?period=${period}`);
      setData(res);
      setError("");
    } catch (err: any) {
      setError(err.detail || "Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("admin_access_token");
      const res = await fetch(`${API_BASE}/api/v1/admin/dashboard/export-excel`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      a.download = `embaixadores_engajamento_${dd}_${mm}_${yyyy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao exportar planilha");
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className={styles.content}>
        <div className="skeleton" style={{ height: 80, borderRadius: "var(--radius-md)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
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

  if (!data) return null;

  // Render Insight
  const insightIcon = {
    success: "✅",
    warning: "⚠️",
    danger: "🚨",
  }[data.insight.status];

  // Prepare Funnel
  const maxFunnel = data.funnel.length > 0 ? Math.max(...data.funnel.map((f) => f.count)) : 1;

  // Prepare Providers
  const providerColors: Record<string, string> = {
    Google: "#2171BA",
    Email: "#4DAA35",
    Apple: "#5F6368",
    Facebook: "#7A3F8F",
  };
  const providerIcons: Record<string, string> = {
    Google: "G",
    Email: "✉",
    Apple: "A",
    Facebook: "f",
  };
  const totalProviders = data.providers.reduce((s, p) => s + p.count, 0) || 1;
  const maxProvider = Math.max(...data.providers.map((p) => p.count), 1);

  // Prepare Pies
  const R = 54, CIRC = 2 * Math.PI * R, SW = 18;

  const renderPie = (title: string, unit: string, segments: { label: string; value: number; color: string }[]) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    let offset = 0;
    return (
      <div className={styles.panel}>
        <h3>{title}</h3>
        <div className={styles.hint}>por status</div>
        <div className={styles.donutWrap}>
          <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label={`${title} por status`}>
            <g transform="rotate(-90 70 70)">
              <circle cx="70" cy="70" r={R} fill="none" stroke="#F1F2F4" strokeWidth={SW} />
              {segments.map((seg, i) => {
                if (total === 0 || seg.value === 0) return null;
                const len = (seg.value / total) * CIRC;
                const strokeDasharray = `${len.toFixed(2)} ${CIRC.toFixed(2)}`;
                const strokeDashoffset = (-offset).toFixed(2);
                offset += len;
                return (
                  <circle
                    key={i}
                    cx="70" cy="70" r={R}
                    fill="none" stroke={seg.color} strokeWidth={SW}
                    strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                  />
                );
              })}
            </g>
            <text x="70" y="66" textAnchor="middle" className={styles.donutTotal}>{fmt(total)}</text>
            <text x="70" y="84" textAnchor="middle" className={styles.donutCap}>{unit}</text>
          </svg>
        </div>
        <div className={styles.legend}>
          {segments.map((seg, i) => (
            <div key={i} className={styles.li}>
              <span className={styles.sw} style={{ background: seg.color }}></span>
              <span className={styles.ln}>{seg.label}</span>
              <span className={styles.lv}>
                {fmt(seg.value)} <small>{total > 0 ? pct(seg.value / total) : "0%"}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const missionSegs = [
    { label: "Finalizadas", value: data.pies.missions.completed || 0, color: "#4DAA35" },
    { label: "Em andamento", value: data.pies.missions.in_progress || 0, color: "#FAD549" },
    { label: "Aguard. Validação", value: data.pies.missions.submitted || 0, color: "#399BD8" },
    { label: "Rejeitadas", value: data.pies.missions.rejected || 0, color: "#E33431" },
  ];

  const eventSegs = [
    { label: "Agendados", value: data.pies.events.agendado || 0, color: "#2171BA" },
    { label: "Em andamento", value: data.pies.events.andamento || 0, color: "#FAD549" },
    { label: "Finalizados", value: data.pies.events.finalizado || 0, color: "#4DAA35" },
  ];

  const materialSegs = [
    { label: "Compartilhados", value: data.pies.materials.shared || 0, color: "#4DAA35" },
    { label: "Não compartilhados", value: data.pies.materials.not_shared || 0, color: "#D4DFE2" },
  ];

  // Prepare Sparkline
  const W = 1000, H = 140, P = 8;
  const tMax = Math.max(...data.trend, 1);
  const tMin = Math.min(...data.trend);
  const getX = (i: number) => P + i * (W - 2 * P) / Math.max(data.trend.length - 1, 1);
  const getY = (v: number) => H - P - ((v - tMin) / (tMax - tMin || 1)) * (H - 2 * P - 10);
  
  let line = "";
  let area = `M ${getX(0)} ${getY(data.trend[0] || 0)}`;
  
  data.trend.forEach((v, i) => {
    const px = getX(i).toFixed(1);
    const py = getY(v).toFixed(1);
    line += `${i === 0 ? "M" : "L"}${px} ${py} `;
    area += ` L ${px} ${py}`;
  });
  
  if (data.trend.length > 0) {
    area += ` L ${getX(data.trend.length - 1)} ${H - P} L ${getX(0)} ${H - P} Z`;
  }

  const sparkTotal = data.trend.reduce((a, b) => a + b, 0);

  return (
    <div className={styles.content}>
      {/* TOPBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard (V2)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="input"
            style={{ width: "auto", height: 38, padding: "0 14px", fontWeight: 600 }}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="all">Todo o período</option>
          </select>
          <button onClick={loadData} className="btn" disabled={loading}>Atualizar</button>
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "8px", height: 38, padding: "0 14px" }}
          >
            <FileSpreadsheet size={16} />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </div>

      {/* INSIGHT */}
      <div className={`${styles.insight} ${styles[data.insight.status]}`} role="status">
        <span className={styles.ic} aria-hidden="true">{insightIcon}</span>
        <div>
          <strong>{data.insight.title}</strong>
          <p>{data.insight.message}</p>
        </div>
      </div>

      {/* KPIS */}
      <div className={styles.eyebrow}>Visão geral & North Star</div>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgBlue}`}><Users size={18}/></div><div className={styles.label}>Total de usuários</div></div>
          <div className={styles.val}>{fmt(data.kpis.total_users)}</div>
          <div className={styles.sub}><span style={{ color: "var(--color-success)", fontWeight: 700 }}>+{data.kpis.new_users_week}</span> novos (7 dias)</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgRed}`}><Zap size={18}/></div><div className={styles.label}>Taxa de ativação</div></div>
          <div className={styles.val}>{pct(data.kpis.activation_rate)}</div>
          <div className={styles.sub}>cadastro → 1ª missão ≤ 48h</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgYellow}`}><UserPlus size={18}/></div><div className={styles.label}>Coeficiente viral</div></div>
          <div className={styles.val}>{data.kpis.viral_coef.toFixed(2)}</div>
          <div className={styles.sub}>convite enviado → validado</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgPurple}`}><TrendingUp size={18}/></div><div className={styles.label}>Média de Pontos</div></div>
          <div className={styles.val}>{fmt(Math.round(data.kpis.avg_points))}</div>
          <div className={styles.sub}>saúde geral do engajamento</div>
        </div>
        {/* Placeholders for evolution */}
        <div className={styles.kpi} style={{ opacity: 0.6 }}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgGreen}`}>◎</div><div className={styles.label}>Missões / ativo semanal</div></div>
          <div className={styles.val}>—</div>
          <div className={styles.sub}>Indisponível (Evolução)</div>
        </div>
        <div className={styles.kpi} style={{ opacity: 0.6 }}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgCyan}`}>◐</div><div className={styles.label}>WAU / MAU</div></div>
          <div className={styles.val}>—</div>
          <div className={styles.sub}>Indisponível (Evolução)</div>
        </div>
      </div>

      {/* FUNNEL + PROVIDERS */}
      <div className={styles.eyebrow}>Progressão & aquisição</div>
      <div className={styles.grid2}>
        <div className={styles.panel}>
          <h3>Funil de progressão de níveis</h3>
          <div className={styles.hint}>Conversão entre níveis · destaca onde a jornada trava</div>
          <div>
            {data.funnel.map((l, i) => {
              const p = Math.round((l.count / maxFunnel) * 100);
              const conv = i > 0 && data.funnel[i - 1].count > 0 
                ? Math.round((l.count / data.funnel[i - 1].count) * 100) 
                : null;
              
              return (
                <div key={l.name} className={styles.row}>
                  <div className={styles.l}>
                    <span className={styles.name}>{l.name}</span>
                    <span className={styles.v}>
                      {fmt(l.count)}
                      {conv !== null && <small>{conv}% ↑</small>}
                    </span>
                  </div>
                  <div className={styles.track}>
                    <i style={{ width: `${Math.max(p, 2)}%`, background: l.color || "var(--color-primary)" }}></i>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.panel}>
          <h3>Usuários por método de login</h3>
          <div className={styles.hint}>Origem da conta na autenticação</div>
          <div>
            {data.providers.length === 0 && <div className={styles.hint}>Nenhum dado disponível.</div>}
            {data.providers.map(p => {
              const pLabel = p.name === "Email" ? "E-mail / senha" : p.name;
              const color = providerColors[p.name] || "#5F6368";
              const icon = providerIcons[p.name] || "?";
              return (
                <div key={p.name} className={styles.provRow}>
                  <span className={styles.pico} style={{ color }}>{icon}</span>
                  <span className={styles.pname}>{pLabel}</span>
                  <div className={styles.track}>
                    <i style={{ width: `${Math.round((p.count / maxProvider) * 100)}%`, background: color }}></i>
                  </div>
                  <span className={styles.pv}>
                    {fmt(p.count)} <small>{pct(p.count / totalProviders)}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PIES */}
      <div className={styles.eyebrow}>Distribuição operacional</div>
      <div className={styles.grid3}>
        {renderPie("Missões", "vínculos", missionSegs)}
        {renderPie("Eventos", "eventos", eventSegs)}
        {renderPie("Materiais", "materiais", materialSegs)}
      </div>

      {/* TREND */}
      <div className={styles.eyebrow}>Tendência</div>
      <div className={`${styles.panel} ${styles.trendPanel}`}>
        <h3>Novos cadastros ({period})</h3>
        <div className={styles.sparkHead}>
          <span className={styles.big}>+{fmt(sparkTotal)}</span>
          <span className={styles.cap}>no período selecionado</span>
        </div>
        {data.trend.length > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="150" preserveAspectRatio="none" role="img" aria-label="Novos cadastros">
            <path d={area} fill="#E9F1FA"></path>
            <path d={line} fill="none" stroke="#2171BA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
            {data.trend.map((v, i) => (
              <circle 
                key={i} 
                cx={getX(i).toFixed(1)} 
                cy={getY(v).toFixed(1)} 
                r={i === data.trend.length - 1 ? 5 : (v === tMax && tMax > 0 ? 4 : 0)} 
                fill="#E33431" 
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
