"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Users,
  Target,
  Calendar,
  FileText,
  Bell,
  ShieldAlert,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: { resource: string; action: string };
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
  { label: "Usuários", href: "/users", icon: <Users size={20} />, permission: { resource: "users", action: "list" } },
  { label: "Missões", href: "/missions", icon: <Target size={20} />, permission: { resource: "missions", action: "list" } },
  { label: "Eventos", href: "/events", icon: <Calendar size={20} />, permission: { resource: "events", action: "list" } },
  { label: "Conteúdo", href: "/content", icon: <FileText size={20} />, permission: { resource: "content", action: "list" } },
  { label: "Notificações", href: "/notifications", icon: <Bell size={20} />, permission: { resource: "notifications", action: "list" } },
  { label: "Moderação", href: "/moderation", icon: <ShieldAlert size={20} />, permission: { resource: "moderation", action: "view_queue" } },
  { label: "Auditoria", href: "/audit", icon: <ScrollText size={20} />, permission: { resource: "audit", action: "view" } },
  { label: "Configurações", href: "/settings", icon: <Settings size={20} />, permission: { resource: "admin_users", action: "list" } },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isLoading, isAuthenticated, logout, hasPermission } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission.resource, item.permission.action);
  });

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: "Super Admin",
      campaign_manager: "Gestor",
      regional_coordinator: "Coordenador",
      moderator: "Moderador",
      analyst: "Analista",
    };
    return labels[role] || role;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ═══ SIDEBAR ═══ */}
      <aside
        style={{
          width: sidebarCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-light)",
          display: "flex",
          flexDirection: "column",
          transition: "width var(--transition-normal)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          overflow: "hidden",
        }}
      >
        {/* Color Bar */}
        <div className="color-bar">
          <div className="color-bar__segment color-bar__segment--red" />
          <div className="color-bar__segment color-bar__segment--yellow" />
          <div className="color-bar__segment color-bar__segment--green" />
          <div className="color-bar__segment color-bar__segment--blue" />
        </div>

        {/* Logo */}
        <div style={{
          padding: "var(--space-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--separator)",
        }}>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-primary)" }}>
                Embaixadores
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Administração
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expandir" : "Recolher"}
            id="sidebar-toggle"
          >
            <ChevronLeft
              size={18}
              style={{
                transform: sidebarCollapsed ? "rotate(180deg)" : "none",
                transition: "transform var(--transition-normal)",
              }}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "var(--space-sm)", overflowY: "auto" }}>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                  setMobileMenuOpen(false);
                }}
                id={`nav-${item.href.replace("/", "")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: sidebarCollapsed ? "var(--space-md)" : "var(--space-md) var(--space-base)",
                  borderRadius: "var(--radius-sm)",
                  color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                  background: isActive ? "var(--color-primary-50)" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.875rem",
                  transition: "all var(--transition-fast)",
                  textDecoration: "none",
                  marginBottom: "var(--space-xs)",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* User Profile / Logout */}
        <div style={{
          padding: "var(--space-base)",
          borderTop: "1px solid var(--separator)",
        }}>
          {!sidebarCollapsed && admin && (
            <div style={{ marginBottom: "var(--space-sm)" }}>
              <div style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {admin.full_name}
              </div>
              <div className="badge badge-primary" style={{ marginTop: "var(--space-xs)" }}>
                {getRoleBadge(admin.role)}
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost btn-sm w-full"
            onClick={handleLogout}
            style={{
              width: "100%",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              color: "var(--color-danger)",
            }}
            id="logout-btn"
          >
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
          transition: "margin-left var(--transition-normal)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Bar (mobile) */}
        <header
          style={{
            height: "var(--topbar-height)",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--space-lg)",
          }}
        >
          <div className="flex items-center gap-md" style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <h2 style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--text)",
            }}>
              {filteredNav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label || "Admin"}
            </h2>
          </div>
          {admin && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
            }}>
              <span>{admin.email}</span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: "var(--space-lg)",
          maxWidth: "1400px",
          width: "100%",
          margin: "0 auto",
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
