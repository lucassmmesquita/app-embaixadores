"use client";

import { useEffect, useCallback, useState } from "react";
import { X, AlertTriangle } from "lucide-react";

// ═══ MODAL SIZES ═══
const SIZE_MAP = {
  sm: 420,
  md: 560,
  lg: 680,
} as const;

export type ModalSize = keyof typeof SIZE_MAP;

export interface ModalProps {
  /** Controls visibility */
  open: boolean;
  /** Called when user clicks X or presses Escape */
  onClose: () => void;
  /** Modal title displayed in the header */
  title?: string;
  /** Optional icon next to the title */
  icon?: React.ReactNode;
  /** Size preset: sm (420px), md (560px), lg (680px) */
  size?: ModalSize;
  /** Modal body content */
  children: React.ReactNode;
  /** Footer content (buttons) — rendered sticky at bottom */
  footer?: React.ReactNode;
  /** Shows a loading spinner instead of children */
  loading?: boolean;
  /** HTML id for testing */
  id?: string;
  /** Error message to display inside the modal */
  error?: string;
}

const MOBILE_BREAKPOINT = 768;

export function Modal({
  open,
  onClose,
  title,
  icon,
  size = "md",
  children,
  footer,
  loading = false,
  id,
  error,
}: ModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  // ─── Responsive detection ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Escape key to close ───
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const maxWidth = SIZE_MAP[size];

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : "var(--space-lg)",
        animation: "fadeIn var(--transition-fast)",
      }}
      id={id ? `${id}-overlay` : undefined}
    >
      <div
        className="modal-panel"
        style={{
          background: "var(--surface)",
          borderRadius: isMobile ? 0 : "var(--radius-xl)",
          boxShadow: isMobile ? "none" : "0 24px 64px rgba(0, 0, 0, 0.15)",
          maxWidth: isMobile ? "100%" : maxWidth,
          width: "100%",
          height: isMobile ? "100dvh" : "auto",
          maxHeight: isMobile ? "100dvh" : "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp var(--transition-normal)",
          overflow: "hidden",
        }}
        id={id}
      >
        {/* ═══ HEADER ═══ */}
        {title && (
          <div
            style={{
              padding: "var(--space-lg)",
              borderBottom: "1px solid var(--separator)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <h2
              className="text-title-3"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                margin: 0,
              }}
            >
              {icon}
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                padding: "var(--space-xs)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color var(--transition-fast)",
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* ═══ BODY ═══ */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-lg)",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "var(--space-2xl)",
              }}
            >
              <div className="spinner" />
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "var(--space-base)" }}
                >
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
              {children}
            </>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        {footer && (
          <div
            style={{
              padding: "var(--space-lg)",
              borderTop: "1px solid var(--separator)",
              display: "flex",
              gap: "var(--space-sm)",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
