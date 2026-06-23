"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Search,
  UserCog,
  Shield,
  Ban,
  CheckCircle2,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Target,
  Star,
  Users,
  Link2,
  Clock,
} from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  total_points: number;
  role: string;
  is_active: boolean;
  level_pending_approval: boolean;
  created_at: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

interface UserDetail {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    cpf: string | null;
    bio: string | null;
    avatar_url: string | null;
    birth_date: string | null;
    gender: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    total_points: number;
    role: string;
    referral_code: string | null;
    referred_by_name: string | null;
    referral_count: number;
    onboarding_completed: boolean;
    level_pending_approval: boolean;
    is_active: boolean;
    created_at: string | null;
    current_level: { name: string; color: string | null } | null;
  };
  activities: {
    id: string;
    action_type: string;
    action_description: string | null;
    points_awarded: number;
    created_at: string | null;
  }[];
  missions: {
    id: string;
    mission_title: string;
    status: string;
    created_at: string | null;
    completed_at: string | null;
  }[];
  badges: {
    id: string;
    name: string;
    description: string;
    icon_url: string | null;
    awarded_at: string | null;
  }[];
  events: {
    registered: number;
    checked_in: number;
  };
}

const ROLE_LABELS: Record<string, string> = {
  participant: "Participante",
  moderator: "Moderador",
  regional_coordinator: "Coordenador",
  campaign_manager: "Gestor",
  analyst: "Analista",
  super_admin: "Super Admin",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  participant: "badge-neutral",
  moderator: "badge-warning",
  regional_coordinator: "badge-info",
  campaign_manager: "badge-primary",
  analyst: "badge-neutral",
  super_admin: "badge-danger",
};

const MISSION_STATUS: Record<string, { label: string; cls: string }> = {
  in_progress: { label: "Em Progresso", cls: "badge-info" },
  submitted: { label: "Submetida", cls: "badge-warning" },
  completed: { label: "Concluída", cls: "badge-success" },
  rejected: { label: "Rejeitada", cls: "badge-danger" },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  mission_completed: "Missão concluída",
  event_checkin: "Check-in evento",
  content_share: "Compartilhamento",
  invite_accepted: "Convite aceito",
  event_share: "Compartilhar evento",
  level_up: "Subiu de nível",
  profile_complete: "Perfil completo",
  daily_login: "Login diário",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
  prefer_not_to_say: "Prefiro não dizer",
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "missions" | "activities" | "badges">("info");
  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.set("search", search);

      const data = await api.get<UsersResponse>(`/api/v1/admin/users?${params}`);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openUserDetail = async (userId: string) => {
    setModalLoading(true);
    setActiveTab("info");
    try {
      const data = await api.get<UserDetail>(`/api/v1/admin/users/${userId}`);
      setSelectedUser(data);
    } catch {
      setError("Erro ao carregar detalhes do usuário");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/v1/admin/reports/export?report_type=users&days=365`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_access_token")}`,
        },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "usuarios.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro ao exportar");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  // ═══ Detail field helper ═══
  const DetailField = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => {
    if (!value || value === "—") return null;
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-md)", padding: "var(--space-sm) 0" }}>
        <Icon size={16} style={{ color: "var(--text-tertiary)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--text)" }}>{value}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-base)" }}>
        <div>
          <h1 className="text-title-2">Gestão de Usuários</h1>
          <p className="text-subhead text-secondary">{total} usuário(s) cadastrado(s)</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {hasPermission("users", "export") && (
            <button className="btn btn-outline btn-sm" onClick={handleExport} id="export-users-btn">
              <Download size={16} />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400 }}>
        <Search size={18} style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-tertiary)",
        }} />
        <input
          type="text"
          className="input"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ paddingLeft: 40 }}
          id="search-users"
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Cidade/UF</th>
                <th>Pontos</th>
                <th>Role</th>
                <th>Status</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openUserDetail(user.id)}
                    style={{ cursor: "pointer" }}
                    id={`user-row-${user.id}`}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-pill)",
                          background: "var(--color-primary-50)",
                          color: "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          flexShrink: 0,
                        }}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{user.full_name}</span>
                        {user.level_pending_approval && (
                          <span className="badge badge-warning" style={{ fontSize: "0.625rem" }}>Pendente</span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{user.email}</td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {user.city && user.state ? `${user.city}/${user.state}` : "—"}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {user.total_points.toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_CLASS[user.role] || "badge-neutral"}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="badge badge-success">Ativo</span>
                      ) : (
                        <span className="badge badge-danger">Suspenso</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: "var(--space-base)",
            borderTop: "1px solid var(--separator)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-sm)",
          }}>
            <button
              className="pagination__btn"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", padding: "0 var(--space-sm)" }}>
              Página {page} de {totalPages}
            </span>
            <button
              className="pagination__btn"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ USER DETAIL MODAL ═══ */}
      {(selectedUser || modalLoading) && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          id="user-detail-modal-overlay"
        >
          <div className="modal" style={{ maxWidth: 680 }} id="user-detail-modal">
            {modalLoading ? (
              <div style={{ padding: "var(--space-2xl)", display: "flex", justifyContent: "center" }}>
                <div className="spinner" />
              </div>
            ) : selectedUser && (
              <>
                {/* Modal Header */}
                <div className="modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--radius-pill)",
                      background: selectedUser.profile.current_level?.color
                        ? `${selectedUser.profile.current_level.color}20`
                        : "var(--color-primary-50)",
                      color: selectedUser.profile.current_level?.color || "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "1.125rem",
                      flexShrink: 0,
                    }}>
                      {selectedUser.profile.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-headline" style={{ marginBottom: 2 }}>
                        {selectedUser.profile.full_name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                        <span className={`badge ${ROLE_BADGE_CLASS[selectedUser.profile.role] || "badge-neutral"}`}>
                          {ROLE_LABELS[selectedUser.profile.role] || selectedUser.profile.role}
                        </span>
                        {selectedUser.profile.current_level && (
                          <span className="badge badge-primary" style={{
                            background: selectedUser.profile.current_level.color
                              ? `${selectedUser.profile.current_level.color}20`
                              : undefined,
                            color: selectedUser.profile.current_level.color || undefined,
                          }}>
                            {selectedUser.profile.current_level.name}
                          </span>
                        )}
                        {selectedUser.profile.is_active ? (
                          <span className="badge badge-success">Ativo</span>
                        ) : (
                          <span className="badge badge-danger">Suspenso</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={closeModal}
                    id="close-user-modal-btn"
                    style={{ flexShrink: 0 }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Stats bar */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 1,
                  background: "var(--separator)",
                  borderBottom: "1px solid var(--separator)",
                }}>
                  {[
                    { label: "Pontos", value: selectedUser.profile.total_points.toLocaleString("pt-BR") },
                    { label: "Missões", value: selectedUser.missions.length.toString() },
                    { label: "Eventos", value: selectedUser.events.registered.toString() },
                    { label: "Indicações", value: selectedUser.profile.referral_count.toString() },
                  ].map((stat) => (
                    <div key={stat.label} style={{
                      background: "var(--surface)",
                      padding: "var(--space-md)",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)" }}>{stat.value}</div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div style={{
                  display: "flex",
                  borderBottom: "1px solid var(--separator)",
                  padding: "0 var(--space-lg)",
                }}>
                  {([
                    { key: "info" as const, label: "Dados Pessoais" },
                    { key: "missions" as const, label: "Missões" },
                    { key: "activities" as const, label: "Atividades" },
                    { key: "badges" as const, label: "Badges" },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        padding: "var(--space-md) var(--space-base)",
                        fontSize: "0.8125rem",
                        fontWeight: activeTab === tab.key ? 600 : 400,
                        color: activeTab === tab.key ? "var(--color-primary)" : "var(--text-secondary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                        marginBottom: -1,
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Modal Body */}
                <div className="modal-body" style={{ maxHeight: 400, overflowY: "auto" }}>
                  {/* ═══ TAB: INFO ═══ */}
                  {activeTab === "info" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                      <DetailField icon={Mail} label="Email" value={selectedUser.profile.email} />
                      <DetailField icon={Phone} label="Telefone" value={selectedUser.profile.phone} />
                      <DetailField icon={MapPin} label="Localização" value={
                        [selectedUser.profile.neighborhood, selectedUser.profile.city, selectedUser.profile.state]
                          .filter(Boolean).join(", ") || null
                      } />
                      <DetailField icon={MapPin} label="CEP" value={selectedUser.profile.zip_code} />
                      <DetailField icon={Calendar} label="Data de Nascimento" value={
                        selectedUser.profile.birth_date
                          ? new Date(selectedUser.profile.birth_date + "T00:00:00").toLocaleDateString("pt-BR")
                          : null
                      } />
                      <DetailField icon={Users} label="Gênero" value={
                        selectedUser.profile.gender
                          ? GENDER_LABELS[selectedUser.profile.gender] || selectedUser.profile.gender
                          : null
                      } />
                      <DetailField icon={Link2} label="Código de Indicação" value={selectedUser.profile.referral_code} />
                      <DetailField icon={Users} label="Indicado por" value={selectedUser.profile.referred_by_name} />
                      <DetailField icon={Calendar} label="Cadastro" value={formatDateTime(selectedUser.profile.created_at)} />

                      {selectedUser.profile.bio && (
                        <div style={{ marginTop: "var(--space-sm)", padding: "var(--space-md)", background: "var(--surface-elevated)", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: 4 }}>Bio</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--text)" }}>{selectedUser.profile.bio}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ TAB: MISSIONS ═══ */}
                  {activeTab === "missions" && (
                    <div>
                      {selectedUser.missions.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                          <Target size={32} style={{ opacity: 0.3, marginBottom: "var(--space-sm)" }} />
                          <p className="text-caption">Nenhuma missão iniciada</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {selectedUser.missions.map((m) => (
                            <div key={m.id} style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "var(--space-md) 0",
                              borderBottom: "1px solid var(--separator)",
                            }}>
                              <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{m.mission_title}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                  Início: {formatDate(m.created_at)}
                                  {m.completed_at && ` · Conclusão: ${formatDate(m.completed_at)}`}
                                </div>
                              </div>
                              <span className={`badge ${MISSION_STATUS[m.status]?.cls || "badge-neutral"}`}>
                                {MISSION_STATUS[m.status]?.label || m.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ TAB: ACTIVITIES ═══ */}
                  {activeTab === "activities" && (
                    <div>
                      {selectedUser.activities.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                          <Clock size={32} style={{ opacity: 0.3, marginBottom: "var(--space-sm)" }} />
                          <p className="text-caption">Nenhuma atividade registrada</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {selectedUser.activities.map((a) => (
                            <div key={a.id} style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "var(--space-md) 0",
                              borderBottom: "1px solid var(--separator)",
                            }}>
                              <div>
                                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                  {ACTION_TYPE_LABELS[a.action_type] || a.action_type}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                                  {a.action_description || formatDateTime(a.created_at)}
                                </div>
                              </div>
                              {a.points_awarded > 0 && (
                                <span style={{
                                  fontSize: "0.8125rem",
                                  fontWeight: 700,
                                  color: "var(--color-success)",
                                }}>
                                  +{a.points_awarded} pts
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ TAB: BADGES ═══ */}
                  {activeTab === "badges" && (
                    <div>
                      {selectedUser.badges.length === 0 ? (
                        <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                          <Award size={32} style={{ opacity: 0.3, marginBottom: "var(--space-sm)" }} />
                          <p className="text-caption">Nenhum badge conquistado</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                          {selectedUser.badges.map((b) => (
                            <div key={b.id} style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-md)",
                              padding: "var(--space-md)",
                              background: "var(--surface-elevated)",
                              borderRadius: "var(--radius-sm)",
                            }}>
                              <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: "var(--radius-md)",
                                background: "var(--color-warning-light)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <Star size={20} style={{ color: "#8B6914" }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{b.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{b.description}</div>
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                                {formatDate(b.awarded_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
