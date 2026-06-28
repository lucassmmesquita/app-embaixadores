"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  Users,
  Target,
  Trophy,
  Coins,
  Calendar,
  FileText,
  Bell,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Award,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: { resource: string; action: string };
  external?: boolean;
}

interface NavSection {
  label?: string; // undefined = no label (e.g. Dashboard)
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Usuários", href: "/users", icon: <Users size={20} />, permission: { resource: "users", action: "list" } },
      { label: "Eventos", href: "/events", icon: <Calendar size={20} />, permission: { resource: "events", action: "list" } },
      { label: "Material", href: "/content", icon: <FileText size={20} />, permission: { resource: "content", action: "list" } },
      { label: "Notificações", href: "/notifications", icon: <Bell size={20} />, permission: { resource: "notifications", action: "list" } },
    ],
  },
  {
    label: "Engajamento",
    items: [
      { label: "Missões", href: "/missions", icon: <Target size={20} />, permission: { resource: "missions", action: "list" } },
      { label: "Conquistas", href: "/badges", icon: <Award size={20} />, permission: { resource: "missions", action: "list" } },
      { label: "Níveis", href: "/levels", icon: <Trophy size={20} />, permission: { resource: "users", action: "list" } },
      { label: "Pontuações", href: "/points", icon: <Coins size={20} />, permission: { resource: "admin_users", action: "list" } },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Auditoria", href: "/audit", icon: <ScrollText size={20} />, permission: { resource: "audit", action: "view" } },
      { label: "Configurações", href: "/settings", icon: <Settings size={20} />, permission: { resource: "admin_users", action: "list" } },
    ],
  },
];

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isLoading, isAuthenticated, logout, hasPermission } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // ─── Responsive detection ───
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < MOBILE_BREAKPOINT);
      setIsTablet(w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT);

      // Auto-collapse on tablet
      if (w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT) {
        setSidebarCollapsed(true);
      }
      // Close mobile menu if resized to desktop
      if (w >= MOBILE_BREAKPOINT) {
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Close mobile menu on navigation ───
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(item.permission.resource, item.permission.action);
    }),
  })).filter((section) => section.items.length > 0);

  // Flat list for topbar title lookup
  const allFilteredItems = filteredSections.flatMap((s) => s.items);

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

  // On mobile: sidebar hidden by default, shown as overlay
  // On tablet: sidebar collapsed (icons only)
  // On desktop: sidebar normal or collapsed
  const showSidebar = isMobile ? mobileMenuOpen : true;
  const effectiveCollapsed = isMobile ? false : (isTablet || sidebarCollapsed);
  const sidebarWidth = effectiveCollapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ═══ MOBILE OVERLAY ═══ */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 45,
            animation: "fadeIn var(--transition-fast)",
          }}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside
        style={{
          width: isMobile ? "var(--sidebar-width)" : sidebarWidth,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-light)",
          display: "flex",
          flexDirection: "column",
          transition: isMobile ? "transform var(--transition-normal)" : "width var(--transition-normal)",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: "hidden",
          // Mobile: slide in/out
          transform: isMobile
            ? (mobileMenuOpen ? "translateX(0)" : "translateX(-100%)")
            : "translateX(0)",
          boxShadow: isMobile && mobileMenuOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
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
          {!effectiveCollapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--color-primary)" }}>
                Embaixadores
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
                Administração
              </div>
            </div>
          )}
          {isMobile ? (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setMobileMenuOpen(false)}
              title="Fechar menu"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={effectiveCollapsed ? "Expandir" : "Recolher"}
              id="sidebar-toggle"
            >
              <ChevronLeft
                size={18}
                style={{
                  transform: effectiveCollapsed ? "rotate(180deg)" : "none",
                  transition: "transform var(--transition-normal)",
                }}
              />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "var(--space-sm)", overflowY: "auto" }}>
          {filteredSections.map((section, sIdx) => (
            <div key={section.label || sIdx}>
              {/* Section separator */}
              {section.label && (
                effectiveCollapsed ? (
                  <div style={{
                    height: 1,
                    background: "var(--separator)",
                    margin: "var(--space-sm) var(--space-sm)",
                  }} />
                ) : (
                  <div style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "var(--space-md) var(--space-base) var(--space-xs)",
                    marginTop: sIdx > 0 ? "var(--space-xs)" : 0,
                  }}>
                    {section.label}
                  </div>
                )
              )}
              {/* Section items */}
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.external) {
                        window.open(item.href, '_blank', 'noopener');
                      } else {
                        router.push(item.href);
                      }
                      setMobileMenuOpen(false);
                    }}
                    id={`nav-${item.href.replace("/", "")}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      padding: effectiveCollapsed ? "var(--space-md)" : "var(--space-md) var(--space-base)",
                      borderRadius: "var(--radius-sm)",
                      color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                      background: isActive ? "var(--color-primary-50)" : "transparent",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "0.9375rem",
                      transition: "all var(--transition-fast)",
                      textDecoration: "none",
                      marginBottom: "var(--space-xs)",
                      justifyContent: effectiveCollapsed ? "center" : "flex-start",
                    }}
                    title={effectiveCollapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!effectiveCollapsed && <span>{item.label}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile / Logout */}
        <div style={{
          padding: "var(--space-base)",
          borderTop: "1px solid var(--separator)",
        }}>
          {!effectiveCollapsed && admin && (
            <div style={{ marginBottom: "var(--space-sm)" }}>
              <div style={{
                fontSize: "0.9375rem",
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
              justifyContent: effectiveCollapsed ? "center" : "flex-start",
              color: "var(--color-danger)",
            }}
            id="logout-btn"
          >
            <LogOut size={18} />
            {!effectiveCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : sidebarWidth,
          transition: "margin-left var(--transition-normal)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Bar */}
        <header
          style={{
            height: "var(--topbar-height)",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--space-lg)",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            {/* Hamburger (mobile only) */}
            {isMobile && (
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setMobileMenuOpen(true)}
                id="mobile-menu-btn"
              >
                <Menu size={22} />
              </button>
            )}
            <h2 style={{
              fontSize: isMobile ? "1rem" : "1.125rem",
              fontWeight: 700,
              color: "var(--text)",
            }}>
              {allFilteredItems.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label || "Admin"}
            </h2>
          </div>
          <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-md)",
            }}>
            <button
              onClick={() => window.open('/help', '_blank', 'noopener')}
              title="Ajuda"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xs)",
                padding: "var(--space-xs) var(--space-sm)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <HelpCircle size={18} />
              {!isMobile && <span>Ajuda</span>}
            </button>
            {admin && !isMobile && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                fontSize: "0.9375rem",
                color: "var(--text-secondary)",
              }}>
                <span>{admin.email}</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? "var(--space-base)" : "var(--space-lg)",
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
