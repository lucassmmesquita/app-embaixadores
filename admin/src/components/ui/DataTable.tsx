"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
 *  DataTable — Componente reutilizável de tabela para o Admin
 *  Features: ordenação por coluna, filtros, skeleton, empty,
 *            paginação, renderização customizada de células.
 *  Responsivo: cards no mobile, tabela no desktop.
 * ═══════════════════════════════════════════════════════════════ */

// ─── Types ───

export interface Column<T> {
  /** Chave do campo no objeto de dados */
  key: keyof T & string;
  /** Label exibido no header */
  label: string;
  /** Permite ordenar por esta coluna? (default: false) */
  sortable?: boolean;
  /** Alinhamento do conteúdo (default: "left") */
  align?: "left" | "center" | "right";
  /** Largura fixa ou mínima */
  width?: string | number;
  /** Renderização customizada da célula */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Ocultar esta coluna no mobile cards (ex: coluna de ações) */
  hideOnMobile?: boolean;
  /** Mostrar como campo principal no card mobile (primeira linha, destaque) */
  primary?: boolean;
}

export interface FilterConfig {
  type: "search" | "select";
  /** Placeholder ou label */
  placeholder?: string;
  label?: string;
  /** Valor atual */
  value: string;
  /** Callback de mudança */
  onChange: (value: string) => void;
  /** Opções (apenas para type="select") */
  options?: { value: string; label: string }[];
}

export interface PaginationConfig {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Texto customizado (default: "Página X de Y") */
  label?: string;
}

export interface DataTableProps<T> {
  /** Definição das colunas */
  columns: Column<T>[];
  /** Dados da tabela */
  data: T[];
  /** Estado de carregamento */
  loading?: boolean;
  /** Mensagem quando não há dados */
  emptyMessage?: string;
  /** Ícone para o empty state (ReactNode) */
  emptyIcon?: React.ReactNode;
  /** Callback ao clicar em uma linha */
  onRowClick?: (row: T) => void;
  /** Chave única para cada row (default: "id") */
  rowKey?: keyof T & string;
  /** Número de rows skeleton durante loading (default: 5) */
  skeletonRows?: number;
  /** Filtros no topo (opcional) */
  filters?: FilterConfig[];
  /** Paginação (opcional — se não fornecida, não mostra) */
  pagination?: PaginationConfig;
  /** Sort padrão */
  defaultSortKey?: keyof T & string;
  defaultSortDirection?: "asc" | "desc";
  /** ID para testes */
  id?: string;
}

type SortDirection = "asc" | "desc";

const MOBILE_BREAKPOINT = 768;

// ─── Component ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  emptyIcon,
  onRowClick,
  rowKey = "id" as keyof T & string,
  skeletonRows = 5,
  filters,
  pagination,
  defaultSortKey,
  defaultSortDirection = "asc",
  id,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDirection);
  const [isMobile, setIsMobile] = useState(false);

  // ─── Responsive detection ───
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Sort handler ───
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ─── Sorted data (client-side) ───
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Nulls last
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        cmp = aVal === bVal ? 0 : aVal ? -1 : 1;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "pt-BR", { sensitivity: "base" });
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // ─── Sort icon ───
  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    }
    return sortDir === "asc" ? (
      <ChevronUp size={14} style={{ color: "var(--color-primary)" }} />
    ) : (
      <ChevronDown size={14} style={{ color: "var(--color-primary)" }} />
    );
  };

  // ─── Identify primary and secondary columns for mobile ───
  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const secondaryCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);

  return (
    <div id={id}>
      {/* ═══ FILTERS BAR ═══ */}
      {filters && filters.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-md)",
            padding: "var(--space-md) var(--space-base)",
            borderBottom: "1px solid var(--separator)",
            flexWrap: "wrap",
          }}
        >
          {filters.map((filter, idx) => {
            if (filter.type === "search") {
              return (
                <div key={idx} style={{ position: "relative", minWidth: isMobile ? 0 : 220, flex: "1 1 auto", maxWidth: isMobile ? "100%" : 360, width: isMobile ? "100%" : undefined }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-tertiary)",
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder={filter.placeholder || "Buscar..."}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    style={{
                      paddingLeft: 34,
                      height: 36,
                      fontSize: "0.8125rem",
                    }}
                  />
                </div>
              );
            }

            if (filter.type === "select") {
              return (
                <select
                  key={idx}
                  className="input"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  style={{
                    width: isMobile ? "calc(50% - 6px)" : "auto",
                    minWidth: isMobile ? 0 : 150,
                    height: "auto",
                    padding: "8px 12px",
                    fontSize: "0.8125rem",
                    color: filter.value ? "var(--text)" : "var(--text-tertiary)",
                    flex: isMobile ? "1 1 auto" : undefined,
                  }}
                >
                  <option value="">{filter.label || "Todos"}</option>
                  {filter.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* ═══ MOBILE CARDS ═══ */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading ? (
            // Mobile skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                style={{
                  padding: "var(--space-base)",
                  borderBottom: "1px solid var(--separator)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <div className="skeleton" style={{ height: 18, width: "60%" }} />
                <div className="skeleton" style={{ height: 14, width: "40%" }} />
                <div className="skeleton" style={{ height: 14, width: "30%" }} />
              </div>
            ))
          ) : sortedData.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "var(--space-2xl) var(--space-lg)",
                color: "var(--text-tertiary)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-sm)" }}>
                {emptyIcon && <div style={{ opacity: 0.4 }}>{emptyIcon}</div>}
                <span>{emptyMessage}</span>
              </div>
            </div>
          ) : (
            sortedData.map((row, rowIdx) => (
              <div
                key={String(row[rowKey] ?? rowIdx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  padding: "var(--space-base)",
                  borderBottom: "1px solid var(--separator)",
                  cursor: onRowClick ? "pointer" : undefined,
                  transition: "background var(--transition-fast)",
                }}
              >
                {/* Primary field */}
                <div style={{ marginBottom: "var(--space-sm)" }}>
                  {primaryCol.render
                    ? primaryCol.render(row[primaryCol.key], row, rowIdx)
                    : <span style={{ fontWeight: 500 }}>{String(row[primaryCol.key] ?? "—")}</span>
                  }
                </div>

                {/* Secondary fields as label: value pairs */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-sm) var(--space-lg)",
                    alignItems: "center",
                  }}
                >
                  {secondaryCols.map((col) => (
                    <div
                      key={col.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-xs)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>
                        {col.label}:
                      </span>
                      <span>
                        {col.render
                          ? col.render(row[col.key], row, rowIdx)
                          : String(row[col.key] ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ═══ DESKTOP TABLE ═══ */
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      textAlign: col.align || "left",
                      width: col.width,
                      cursor: col.sortable ? "pointer" : "default",
                      userSelect: col.sortable ? "none" : undefined,
                    }}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {col.label}
                      {col.sortable && <SortIcon columnKey={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align || "left" }}>
                        <div
                          className="skeleton"
                          style={{ height: 18, width: "70%", display: "inline-block" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      textAlign: "center",
                      padding: "var(--space-2xl) var(--space-lg)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-sm)" }}>
                      {emptyIcon && <div style={{ opacity: 0.4 }}>{emptyIcon}</div>}
                      <span>{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rowIdx) => (
                  <tr
                    key={String(row[rowKey] ?? rowIdx)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    style={{ cursor: onRowClick ? "pointer" : undefined }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} style={{ textAlign: col.align || "left" }}>
                        {col.render
                          ? col.render(row[col.key], row, rowIdx)
                          : (row[col.key] as React.ReactNode) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ PAGINATION ═══ */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: "var(--space-md) var(--space-base)",
            borderTop: "1px solid var(--separator)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-sm)",
          }}
        >
          <button
            className="pagination__btn"
            onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              padding: "0 var(--space-sm)",
            }}
          >
            {pagination.label || `Página ${pagination.page} de ${pagination.totalPages}`}
          </span>
          <button
            className="pagination__btn"
            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page === pagination.totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
