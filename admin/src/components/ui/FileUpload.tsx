"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, Link2, X, FileText, Image, Film, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

/* ═══════════════════════════════════════════════════════════════
 *  FileUpload — Componente reutilizável de upload de arquivo
 *  Features: drag-and-drop, upload direto, URL manual, preview
 * ═══════════════════════════════════════════════════════════════ */

interface FileUploadProps {
  /** URL atual do arquivo */
  value: string;
  /** Callback quando URL muda */
  onChange: (url: string) => void;
  /** Nome original do arquivo */
  displayName?: string;
  /** Callback quando nome do arquivo muda */
  onNameChange?: (name: string) => void;
  /** Label do campo */
  label: string;
  /** Tipos MIME aceitos (ex: "image/*,video/*,application/pdf") */
  accept?: string;
  /** Pasta de destino no backend ('content' | 'thumbnails') */
  folder?: "content" | "thumbnails";
  /** Tamanho máximo em MB */
  maxSizeMB?: number;
}

export function FileUpload({
  value,
  onChange,
  displayName = "",
  onNameChange,
  label,
  accept = "image/*,video/*,application/pdf",
  folder = "content",
  maxSizeMB = 50,
}: FileUploadProps) {
  const isUploadedFile = (url: string) => url.includes("/uploads/");
  const [mode, setMode] = useState<"upload" | "url">(value && !isUploadedFile(value) ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
  const isVideo = (url: string) => /\.(mp4|webm|mov)$/i.test(url);

  /** Resolve relative /uploads/... paths to the full backend URL */
  const resolveUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith("/uploads")) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      return `${apiBase}${url}`;
    }
    return url;
  };

  const handleUpload = useCallback(async (file: File) => {
    setError("");

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/v1/admin/upload?folder=${folder}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_access_token")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erro ao fazer upload" }));
        throw new Error(err.detail || `Erro ${res.status}`);
      }

      const data = await res.json();
      onChange(data.url);
      onNameChange?.(file.name);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }, [folder, maxSizeMB, onChange, onNameChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [handleUpload]);

  const handleRemove = () => {
    onChange("");
    onNameChange?.("");
    setError("");
  };

  return (
    <div className="form-group">
      <label className="label">{label}</label>
      <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--separator)", marginBottom: "var(--space-sm)" }}>
        <button
          type="button"
          onClick={() => setMode("upload")}
          style={{
            flex: 1, padding: "6px 12px", fontSize: "0.8125rem", fontWeight: 500,
            border: "none", cursor: "pointer",
            background: mode === "upload" ? "var(--color-primary)" : "var(--bg-secondary)",
            color: mode === "upload" ? "#fff" : "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all var(--transition-fast)",
          }}
        >
          <Upload size={14} /> Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          style={{
            flex: 1, padding: "6px 12px", fontSize: "0.8125rem", fontWeight: 500,
            border: "none", cursor: "pointer", borderLeft: "1px solid var(--separator)",
            background: mode === "url" ? "var(--color-primary)" : "var(--bg-secondary)",
            color: mode === "url" ? "#fff" : "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all var(--transition-fast)",
          }}
        >
          <Link2 size={14} /> Link
        </button>
      </div>

      {mode === "url" ? (
        <input
          type="url"
          className="input"
          value={isUploadedFile(value) ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      ) : (
        <>
          {/* Preview or Drop Zone */}
          {value && !uploading ? (
            <div style={{
              position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden",
              border: "1px solid var(--separator)", background: "var(--bg-secondary)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-sm)",
                padding: "var(--space-md)",
              }}>
                {isVideo(value) ? <Film size={24} color="var(--color-primary)" /> : <Image size={24} color="var(--color-primary)" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName || value.split("/").pop()}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                    {isVideo(value) ? "Vídeo" : "Imagem"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 24, height: 24, borderRadius: "var(--radius-pill)",
                  background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} color="#fff" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--separator)"}`,
                borderRadius: "var(--radius-md)",
                padding: "var(--space-lg) var(--space-md)",
                textAlign: "center",
                cursor: uploading ? "default" : "pointer",
                background: dragOver ? "var(--color-primary-50)" : "var(--bg-secondary)",
                transition: "all var(--transition-fast)",
              }}
            >
              {uploading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <Loader2 size={24} color="var(--color-primary)" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Enviando...</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <Upload size={24} color="var(--text-tertiary)" />
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    Arraste um arquivo ou <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>clique para selecionar</span>
                  </span>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>
                    Máx. {maxSizeMB}MB
                  </span>
                </div>
              )}
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </>
      )}

      {error && (
        <div style={{ fontSize: "0.8125rem", color: "var(--color-danger)", marginTop: "var(--space-xs)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
