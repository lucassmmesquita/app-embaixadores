"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { DataTable, Column } from "@/components/ui/DataTable";
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
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Target,
  Users,
  Link2,
  Clock,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

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
  current_level: { name: string; color: string | null } | null;
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
  const [levelFilter, setLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const pageSize = 20;

  // Load levels for filter dropdown
  useEffect(() => {
    api.get<{ id: string; name: string; order_index: number }[]>("/api/v1/admin/levels")
      .then((data) => setLevels(data.sort((a, b) => a.order_index - b.order_index)))
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (levelFilter) params.set("level_id", levelFilter);
      if (statusFilter) params.set("is_active", statusFilter === "active" ? "true" : "false");

      const data = await api.get<UsersResponse>(`/api/v1/admin/users?${params}`);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [page, search, levelFilter, statusFilter]);

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

  // ─── Column definitions ───
  const userColumns: Column<User>[] = [
    {
      key: "full_name",
      label: "Nome",
      sortable: true,
      primary: true,
      render: (_val, row) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 500 }}>{row.full_name}</span>
          {row.level_pending_approval && (
            <span className="badge badge-warning" style={{ fontSize: "0.6875rem", alignSelf: "flex-start", marginTop: 2 }}>Pendente</span>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (val) => <span style={{ color: "var(--text-secondary)" }}>{String(val)}</span>,
    },
    {
      key: "total_points",
      label: "Pontos",
      sortable: true,
      align: "right",
      render: (val) => <span style={{ fontWeight: 600 }}>{Number(val).toLocaleString("pt-BR")}</span>,
    },
    {
      key: "current_level" as keyof User & string,
      label: "Nível",
      sortable: false,
      render: (_val, row) => {
        const level = row.current_level;
        if (!level) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
        return (
          <span style={{ color: level.color || "var(--text-secondary)", fontWeight: 500 }}>
            {level.name}
          </span>
        );
      },
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (val) => (
        <span className={`badge ${val ? "badge-success" : "badge-danger"}`}>
          {val ? "Ativo" : "Suspenso"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Cadastro",
      sortable: true,
      hideOnMobile: true,
      render: (val) => (
        <span style={{ color: "var(--text-tertiary)" }}>
          {new Date(String(val)).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
  ];

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Usuários</h1>
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

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={userColumns}
          data={users}
          loading={loading}
          emptyMessage="Nenhum usuário encontrado"
          emptyIcon={<Users size={32} />}
          onRowClick={(user) => openUserDetail(user.id)}
          defaultSortKey="full_name"
          filters={[
            {
              type: "search",
              placeholder: "Buscar por nome ou email...",
              value: search,
              onChange: (val) => { setSearch(val); setPage(1); },
            },
            {
              type: "select",
              label: "Nível",
              value: levelFilter,
              onChange: (val) => { setLevelFilter(val); setPage(1); },
              options: levels.map((l) => ({ value: l.id, label: l.name })),
            },
            {
              type: "select",
              label: "Status",
              value: statusFilter,
              onChange: (val) => { setStatusFilter(val); setPage(1); },
              options: [
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Suspenso" },
              ],
            },
          ]}
          pagination={{
            page,
            totalPages,
            onPageChange: setPage,
          }}
          id="users-table"
        />
      </div>

      <Modal
        open={!!(selectedUser || modalLoading)}
        onClose={closeModal}
        title={selectedUser?.profile.full_name || "Usuário"}
        icon={<UserCog size={20} color="var(--color-primary)" />}
        size="lg"
        loading={modalLoading}
        id="user-detail-modal"
      >
        {selectedUser && (
          <>
            {/* User Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "var(--radius-pill)",
                background: selectedUser.profile.current_level?.color ? `${selectedUser.profile.current_level.color}20` : "var(--color-primary-50)",
                color: selectedUser.profile.current_level?.color || "var(--color-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "1.125rem", flexShrink: 0,
              }}>
                {selectedUser.profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
                {selectedUser.profile.current_level && (
                  <span className="badge badge-primary" style={{
                    background: selectedUser.profile.current_level.color ? `${selectedUser.profile.current_level.color}20` : undefined,
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

            {/* Stats bar */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
              background: "var(--separator)", borderRadius: "var(--radius-md)", overflow: "hidden",
              marginBottom: "var(--space-lg)",
            }}>
              {[
                { label: "Pontos", value: selectedUser.profile.total_points.toLocaleString("pt-BR") },
                { label: "Missões", value: selectedUser.missions.length.toString() },
                { label: "Eventos", value: selectedUser.events.registered.toString() },
                { label: "Indicações", value: selectedUser.profile.referral_count.toString() },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "var(--surface)", padding: "var(--space-md)", textAlign: "center" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text)" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--separator)", marginBottom: "var(--space-lg)", overflowX: "auto" }}>
              {([
                { key: "info" as const, label: "Dados Pessoais" },
                { key: "missions" as const, label: "Missões" },
                { key: "activities" as const, label: "Atividades" },
                { key: "badges" as const, label: "Conquistas" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "var(--space-md) var(--space-base)",
                    fontSize: "0.8125rem",
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? "var(--color-primary)" : "var(--text-secondary)",
                    background: "none", border: "none", cursor: "pointer",
                    borderBottom: activeTab === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                    marginBottom: -1, transition: "all var(--transition-fast)", whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ height: 320, overflowY: "auto" }}>
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
                      <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-md) 0", borderBottom: "1px solid var(--separator)" }}>
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
                      <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-md) 0", borderBottom: "1px solid var(--separator)" }}>
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{ACTION_TYPE_LABELS[a.action_type] || a.action_type}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{a.action_description || formatDateTime(a.created_at)}</div>
                        </div>
                        {a.points_awarded > 0 && (
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-success)" }}>+{a.points_awarded} pontos</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: CONQUISTAS ═══ */}
            {activeTab === "badges" && (
              <div>
                {selectedUser.badges.length === 0 ? (
                  <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                    <Award size={32} style={{ opacity: 0.3, marginBottom: "var(--space-sm)" }} />
                    <p className="text-caption">Nenhuma conquista obtida</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {selectedUser.badges.map((b) => (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-md) 0", borderBottom: "1px solid var(--separator)" }}>
                        <div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{b.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{b.description}</div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{formatDate(b.awarded_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
