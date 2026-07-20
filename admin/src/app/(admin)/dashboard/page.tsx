"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle, TrendingUp, Users, Zap, UserPlus, FileSpreadsheet, Calendar, FileText, MousePointerClick, Share2, CheckCircle } from "lucide-react";
import styles from "./dashboard.module.css";

interface DashboardV2Data {
  insight: {
    status: "success" | "warning" | "danger";
    title: string;
    message: string;
  };
  kpis: {
    total_users: number;
    new_users_period: number;
    activation_rate: number;
    viral_coef: number;
    total_points_period: number;
    points_distribution: Record<string, number>;
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
  missions_analytics: {
    adoption: {
      users_started: number;
      users_completed: number;
      total_active: number;
    };
    funnel: {
      started: number;
      submitted: number;
      completed: number;
    };
    top_5: {
      title: string;
      completions: number;
    }[];
  };
  events_analytics: {
    funnel: {
      scheduled: number;
      registered: number;
      unique_registered: number;
      checkins: number;
    };
    top_5: { title: string; completions: number }[];
  };
  materials_analytics: {
    funnel: {
      active: number;
      shares: number;
      clicks: number;
    };
    top_5: { title: string; completions: number }[];
  };
  trend: { label: string; value: number }[];
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

  const periodLabels: Record<string, string> = {
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    "90d": "Últimos 90 dias",
    "all": "Todo o período"
  };
  const periodLabel = periodLabels[period] || period;

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

  // Prepare Sparkline calcs
  const W = 1000, H = 160, P = 12;
  const tMax = Math.max(...data.trend.map(t => t.value), 1);
  const getX = (i: number) => P + i * (W - 2 * P) / Math.max(data.trend.length - 1, 1);
  const getY = (v: number) => H - P - 24 - ((v - 0) / (tMax - 0)) * (H - 2 * P - 44);
  const line = data.trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(t.value).toFixed(1)}`).join(' ');
  const area = `${line} L ${getX(data.trend.length - 1).toFixed(1)} ${H - 24} L ${getX(0).toFixed(1)} ${H - 24} Z`;
  const sparkTotal = data.kpis.new_users_period;

  return (
    <div className={styles.content}>
      {/* TOPBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Dashboard</h2>
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
      <div className={styles.eyebrow}>Visão geral</div>
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgBlue}`}><Users size={18} /></div><div className={styles.label}>Total de usuários</div></div>
          <div className={styles.val}>{fmt(data.kpis.total_users)}</div>
          <div className={styles.sub}><span style={{ color: "var(--color-success)", fontWeight: 700 }}>+{data.kpis.new_users_period}</span> novos ({periodLabel})</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgRed}`}><Zap size={18} /></div><div className={styles.label}>Taxa de ativação <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.9em' }}>({periodLabel})</span></div></div>
          <div className={styles.val}>{pct(data.kpis.activation_rate)}</div>
          <div className={styles.sub}>cadastro &rarr; 1ª missão &le; 48h</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgYellow}`}><UserPlus size={18} /></div><div className={styles.label}>Taxa de Indicação <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.9em' }}>({periodLabel})</span></div></div>
          <div className={styles.val}>{data.kpis.viral_coef.toFixed(2)}</div>
          <div className={styles.sub}>convite enviado &rarr; cadastro validado</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.top}><div className={`${styles.ico} ${styles.bgPurple}`}><TrendingUp size={18} /></div><div className={styles.label}>Pontos Distribuídos <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.9em' }}>({periodLabel})</span></div></div>
          <div className={styles.val}>{fmt(data.kpis.total_points_period)}</div>
          
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.kpis.total_points_period === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Nenhum ponto no período</div>
            ) : (
              <>
                <div style={{ display: 'flex', height: '6px', width: '100%', borderRadius: '3px', overflow: 'hidden' }}>
                  {Object.entries(data.kpis.points_distribution).sort((a,b) => b[1] - a[1]).map(([source, val]) => (
                    <div key={source} style={{ width: `${(val / data.kpis.total_points_period) * 100}%`, background: source === 'mission' ? '#8a2be2' : source === 'event' ? '#4DAA35' : source === 'invitation' ? '#F59E0B' : source === 'material' ? '#2171BA' : source === 'registration' ? '#0ea5e9' : '#9ca3af' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-tertiary)', flexWrap: 'wrap', marginTop: '2px' }}>
                  {Object.entries(data.kpis.points_distribution).sort((a,b) => b[1] - a[1]).map(([source, val]) => (
                    <div key={source} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: source === 'mission' ? '#8a2be2' : source === 'event' ? '#4DAA35' : source === 'invitation' ? '#F59E0B' : source === 'material' ? '#2171BA' : source === 'registration' ? '#0ea5e9' : '#9ca3af' }} />
                      <span>{source === 'mission' ? 'Missões' : source === 'event' ? 'Eventos' : source === 'invitation' ? 'Indicação' : source === 'material' ? 'Materiais' : source === 'registration' ? 'Cadastros' : 'Outros'} ({Math.round((val / data.kpis.total_points_period) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* USERS (Trend + Funnel + Providers) */}
      <div className={styles.eyebrow}>Usuários</div>
      <div className={styles.gridUsers}>

        {/* Novos Cadastros */}
        <div className={`${styles.panel} ${styles.trendPanel}`}>
          <h3>Novos cadastros <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.sparkHead}>
            <span className={styles.big}>+{fmt(sparkTotal)}</span>
            <span className={styles.cap}>no período selecionado</span>
          </div>
          {data.trend.length > 0 && (
            <div style={{ position: 'relative', height: '160px', width: '100%', marginTop: '16px' }}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="160" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                <path d={area} fill="#E9F1FA"></path>
                <path d={line} fill="none" stroke="#2171BA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"></path>
              </svg>

              {/* Overlay HTML para não distorcer fontes e bolinhas */}
              {data.trend.map((t, i) => {
                const showLabel = data.trend.length <= 8 || i % Math.ceil(data.trend.length / 6) === 0 || i === data.trend.length - 1;
                const leftPct = (getX(i) / W) * 100;
                const topPx = getY(t.value);

                return (
                  <div key={i} style={{ position: 'absolute', left: `${leftPct}%`, top: 0, bottom: 0, width: 2, transform: 'translateX(-50%)', pointerEvents: 'none' }}>

                    {/* Bolinha */}
                    <div style={{ position: 'absolute', top: topPx - 4, left: -3, width: 8, height: 8, borderRadius: '50%', background: '#2171BA' }}></div>

                    {/* Valor numérico (Y) */}
                    {t.value > 0 && (
                      <div style={{ position: 'absolute', top: topPx - 26, left: -20, width: 40, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                        {t.value}
                      </div>
                    )}

                    {/* Data (X) */}
                    {showLabel && (
                      <div style={{
                        position: 'absolute',
                        bottom: -4,
                        left: i === 0 ? 0 : i === data.trend.length - 1 ? -60 : -30,
                        width: 60,
                        textAlign: i === 0 ? 'left' : i === data.trend.length - 1 ? 'right' : 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap'
                      }}>
                        {t.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Progressão de Níveis */}
        <div className={styles.panel}>
          <h3>Progressão de níveis</h3>
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

      {/* ENGAGEMENT - MISSIONS */}
      <div className={styles.eyebrow}>Missões</div>
      <div className={styles.operationalRow}>

        {/* Jornada e Adoção */}
        <div className={styles.opCard}>
          <h3><TrendingUp size={16} /> Jornada de Adoção <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Engajamento e queda de retenção nas missões</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div className={styles.adoptionBig} style={{ margin: 0 }}>
              {pct(data.missions_analytics.adoption.users_started / (data.missions_analytics.adoption.total_active || 1))}
            </div>
            <div className={styles.adoptionSub} style={{ maxWidth: '140px', lineHeight: 1.3 }}>
              da base de embaixadores iniciou missões no período
            </div>
          </div>

          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>1. Iniciaram</span>
              <div className={styles.value}>{fmt(data.missions_analytics.funnel.started)} <span className={styles.pct}>100%</span></div>
            </div>
            <div className={styles.funnelBarBg}><div className={styles.funnelBarFill} style={{ width: '100%', background: '#FAD549' }}></div></div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>2. Submeteram</span>
              <div className={styles.value}>{fmt(data.missions_analytics.funnel.submitted)} <span className={styles.pct}>{pct(data.missions_analytics.funnel.submitted / (data.missions_analytics.funnel.started || 1))}</span></div>
            </div>
            <div className={styles.funnelBarBg}><div className={styles.funnelBarFill} style={{ width: (data.missions_analytics.funnel.submitted / (data.missions_analytics.funnel.started || 1)) * 100 + '%', background: '#399BD8' }}></div></div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>3. Concluíram</span>
              <div className={styles.value}>{fmt(data.missions_analytics.funnel.completed)} <span className={styles.pct}>{pct(data.missions_analytics.funnel.completed / (data.missions_analytics.funnel.started || 1))}</span></div>
            </div>
            <div className={styles.funnelBarBg}><div className={styles.funnelBarFill} style={{ width: (data.missions_analytics.funnel.completed / (data.missions_analytics.funnel.started || 1)) * 100 + '%', background: '#4DAA35' }}></div></div>
          </div>
        </div>

        {/* Ranking */}
        <div className={styles.opCard}>
          <h3><Zap size={16} /> Top 5 Populares <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Missões com maior taxa de conclusão</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
            <span>Missão</span>
            <span>Conclusões</span>
          </div>

          <div className={styles.rankingList}>
            {data.missions_analytics.top_5.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma missão concluída</div>
            ) : (
              data.missions_analytics.top_5.map((item, i) => (
                <div key={i} className={styles.rankingItem}>
                  <div className={styles.rankingNum}>{i + 1}</div>
                  <div className={styles.rankingTitle} title={item.title}>{item.title}</div>
                  <div className={styles.rankingScore}>{fmt(item.completions)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ENGAGEMENT - EVENTS */}
      <div className={styles.eyebrow}>Eventos</div>
      <div className={styles.operationalRow}>

        {/* Jornada de Eventos */}
        <div className={styles.opCard}>
          <h3><Calendar size={16} /> Jornada de Participação <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Conversão de interesse em presença real</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div className={styles.adoptionBig} style={{ margin: 0, color: '#2171BA' }}>
              {pct(data.events_analytics.funnel.unique_registered / (data.kpis.total_users || 1))}
            </div>
            <div className={styles.adoptionSub} style={{ maxWidth: '140px', lineHeight: 1.3 }}>
              da base de embaixadores se inscreveu nos eventos
            </div>
          </div>

          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>1. Eventos Criados</span>
              <div className={styles.value}>{fmt(data.events_analytics.funnel.scheduled)}</div>
            </div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>2. Inscrições Totais</span>
              <div className={styles.value}>{fmt(data.events_analytics.funnel.registered)}</div>
            </div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>3. Check-ins (Presenças)</span>
              <div className={styles.value}>{fmt(data.events_analytics.funnel.checkins)} <span className={styles.pct}>{pct(data.events_analytics.funnel.checkins / (data.events_analytics.funnel.registered || 1))}</span></div>
            </div>
            <div className={styles.funnelBarBg}><div className={styles.funnelBarFill} style={{ width: (data.events_analytics.funnel.checkins / (data.events_analytics.funnel.registered || 1)) * 100 + '%', background: '#2171BA' }}></div></div>
          </div>
        </div>

        {/* Ranking Eventos */}
        <div className={styles.opCard}>
          <h3><CheckCircle size={16} /> Top 5 Eventos <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Eventos com maior número de presenças confirmadas</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
            <span>Evento</span>
            <span>Check-ins</span>
          </div>

          <div className={styles.rankingList}>
            {data.events_analytics.top_5.length === 0 ? (
              <div className={styles.emptyState}>Nenhum check-in registrado</div>
            ) : (
              data.events_analytics.top_5.map((item, i) => (
                <div key={i} className={styles.rankingItem}>
                  <div className={styles.rankingNum}>{i + 1}</div>
                  <div className={styles.rankingTitle} title={item.title}>{item.title}</div>
                  <div className={styles.rankingScore}>{fmt(item.completions)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ENGAGEMENT - MATERIALS */}
      <div className={styles.eyebrow}>Materiais</div>
      <div className={styles.operationalRow}>

        {/* Tração de Materiais */}
        <div className={styles.opCard}>
          <h3><Share2 size={16} /> Tração e Alcance <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Como os conteúdos estão sendo propagados</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div className={styles.adoptionBig} style={{ margin: 0, color: '#4DAA35' }}>
              {fmt(data.materials_analytics.funnel.shares)}
            </div>
            <div className={styles.adoptionSub} style={{ maxWidth: '140px', lineHeight: 1.3 }}>
              compartilhamentos efetuados pelos embaixadores
            </div>
          </div>

          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>1. Materiais Ativos</span>
              <div className={styles.value}>{fmt(data.materials_analytics.funnel.active)}</div>
            </div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>2. Compartilhamentos</span>
              <div className={styles.value}>{fmt(data.materials_analytics.funnel.shares)}</div>
            </div>
          </div>
          <div className={styles.funnelStep}>
            <div className={styles.funnelHeader}>
              <span className={styles.label}>3. Cliques Únicos Gerados</span>
              <div className={styles.value}>{fmt(data.materials_analytics.funnel.clicks)}</div>
            </div>
            <div className={styles.funnelBarBg}><div className={styles.funnelBarFill} style={{ width: (data.materials_analytics.funnel.shares > 0 ? Math.min((data.materials_analytics.funnel.clicks / data.materials_analytics.funnel.shares) * 50, 100) : 0) + '%', background: '#4DAA35' }}></div></div>
          </div>
        </div>

        {/* Ranking Materiais */}
        <div className={styles.opCard}>
          <h3><FileText size={16} /> Top 5 Materiais <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>({periodLabel})</span></h3>
          <div className={styles.hint}>Conteúdos mais virais (compartilhamentos + cliques)</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, paddingBottom: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
            <span>Material</span>
            <span>Compartilhamento + clique</span>
          </div>

          <div className={styles.rankingList}>
            {data.materials_analytics.top_5.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma métrica registrada</div>
            ) : (
              data.materials_analytics.top_5.map((item, i) => (
                <div key={i} className={styles.rankingItem}>
                  <div className={styles.rankingNum}>{i + 1}</div>
                  <div className={styles.rankingTitle} title={item.title}>{item.title}</div>
                  <div className={styles.rankingScore}>{fmt(item.completions)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

  );
}
