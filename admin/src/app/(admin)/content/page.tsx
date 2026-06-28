"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, FileText, AlertTriangle } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FileUpload } from "@/components/ui/FileUpload";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  thumbnail_url: string | null;
  thumbnail_name: string | null;
  category: string | null;
  tags: string[] | null;
  share_text: string | null;
  points_per_share: number;
  is_featured: boolean;
  total_shares: number;
  is_active: boolean;
  created_at: string;
}

interface ContentType {
  value: string;
  label: string;
  icon: string;
  emoji: string;
  color: string;
  filterable: boolean;
}

export default function ContentPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [info, setInfo] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<Partial<Content>>({
    title: "",
    description: "",
    content_type: "image",
    file_url: "",
    file_name: "",
    thumbnail_url: "",
    thumbnail_name: "",
    category: "",
    share_text: "",
    points_per_share: 5,
    is_featured: false,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadContentTypes();
    loadContent();
  }, []);

  const loadContentTypes = async () => {
    try {
      const types = await api.get<ContentType[]>("/api/v1/content/types");
      setContentTypes(types);
    } catch {
      // Fallback
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: Content[] }>("/api/v1/admin/content?page_size=50");
      setItems(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setInfo(msg);
    setTimeout(() => { setError(""); setInfo(""); }, 3000);
  };

  const openModal = (content?: Content) => {
    if (content) {
      setEditingContent(content);
      setFormData({
        title: content.title,
        description: content.description || "",
        content_type: content.content_type,
        file_url: content.file_url || "",
        file_name: content.file_name || "",
        thumbnail_url: content.thumbnail_url || "",
        thumbnail_name: content.thumbnail_name || "",
        category: content.category || "",
        share_text: content.share_text || "",
        points_per_share: content.points_per_share,
        is_featured: content.is_featured,
        is_active: content.is_active
      });
    } else {
      setEditingContent(null);
      setFormData({
        title: "",
        description: "",
        content_type: "image",
        file_url: "",
        file_name: "",
        thumbnail_url: "",
        thumbnail_name: "",
        category: "",
        share_text: "",
        points_per_share: 5,
        is_featured: false,
        is_active: true
      });
    }
    setIsModalOpen(true);
    setModalError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContent(null);
    setModalError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    
    setFormData(prev => ({
      ...prev,
      [name]: target.type === "number" ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!formData.file_url) {
      setModalError("Informe um arquivo (upload) ou link para o conteúdo.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = { ...formData };
      if (!payload.description) payload.description = null;
      if (!payload.file_url) payload.file_url = null;
      if (!payload.thumbnail_url) payload.thumbnail_url = null;
      if (!payload.category) payload.category = null;
      if (!payload.share_text) payload.share_text = null;

      if (editingContent) {
        await api.patch(`/api/v1/admin/content/${editingContent.id}`, payload);
        showMessage("Conteúdo atualizado com sucesso");
      } else {
        await api.post("/api/v1/admin/content", payload);
        showMessage("Conteúdo criado com sucesso");
      }
      closeModal();
      loadContent();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setModalError(apiErr.detail || "Erro ao salvar conteúdo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja inativar este material?")) return;
    
    try {
      await api.delete(`/api/v1/admin/content/${id}`);
      showMessage("Conteúdo inativado com sucesso");
      loadContent();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao inativar conteúdo", true);
    }
  };

  const toggleStatus = async (content: Content) => {
    try {
      await api.patch(`/api/v1/admin/content/${content.id}`, {
        is_active: !content.is_active,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === content.id ? { ...item, is_active: !item.is_active } : item
        )
      );
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar status", true);
    }
  };

  // ─── Filtered data ───
  const filteredItems = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !(item.category || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    if (typeFilter && item.content_type !== typeFilter) return false;
    if (statusFilter === "active" && !item.is_active) return false;
    if (statusFilter === "inactive" && item.is_active) return false;
    return true;
  });

  // ─── Column definitions ───
  const columns: Column<Content>[] = [
    {
      key: "title",
      label: "Material",
      sortable: true,
      primary: true,
      render: (val) => <span style={{ fontWeight: 500 }}>{String(val)}</span>,
    },
    {
      key: "total_shares",
      label: "Compartilhamentos",
      sortable: true,
      align: "right",
      hideOnMobile: true,
      render: (val) => <span style={{ fontWeight: 600 }}>{String(val || 0)}</span>,
    },
    {
      key: "content_type",
      label: "Tipo",
      sortable: true,
      render: (val) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {contentTypes.find(t => t.value === val)?.label || String(val)}
        </span>
      ),
    },
    {
      key: "points_per_share",
      label: "Pontos",
      sortable: true,
      align: "right",
      render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (_val, row) => (
        <label className="toggle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!row.is_active}
            onChange={() => toggleStatus(row)}
          />
          <div className="toggle__track" />
          <div className="toggle__thumb" />
        </label>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Material</h1>
          <p className="text-subhead text-secondary">{items.length} material(is)</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          Novo Conteúdo
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={columns}
          data={filteredItems}
          loading={loading}
          emptyMessage="Nenhum material encontrado"
          emptyIcon={<FileText size={32} />}
          onRowClick={(row) => openModal(row)}
          defaultSortKey="title"
          filters={[
            { type: "search", placeholder: "Buscar por título ou categoria...", value: search, onChange: setSearch },
            {
              type: "select",
              label: "Tipo",
              value: typeFilter,
              onChange: setTypeFilter,
              options: contentTypes.map(t => ({ value: t.value, label: t.label })),
            },
            {
              type: "select",
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
              ],
            },
          ]}
          id="content-table"
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingContent ? "Editar Material" : "Novo Material"}
        icon={<FileText size={20} color="var(--color-primary)" />}
        size="lg"
        id="content-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="content-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="content-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          <div className="form-group">
            <label className="label">Título *</label>
            <input required type="text" className="input" name="title" value={formData.title || ""} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label className="label">Descrição (Opcional)</label>
            <textarea className="input" name="description" value={formData.description || ""} onChange={handleInputChange} rows={2} />
          </div>

          <div className="form-group">
            <label className="label">Tipo de Conteúdo *</label>
            <select required className="input" name="content_type" value={formData.content_type || ""} onChange={handleInputChange}>
              {contentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Arquivo: Post = só link, Image = upload imagem, Video = upload vídeo */}
          {formData.content_type === "post" ? (
            <div className="form-group">
              <label className="label">Link do post</label>
              <input
                type="url"
                className="input"
                name="file_url"
                value={formData.file_url || ""}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>
          ) : (
            <FileUpload
              label="Arquivo"
              value={formData.file_url || ""}
              onChange={(url) => setFormData(prev => ({ ...prev, file_url: url }))}
              displayName={formData.file_name || ""}
              onNameChange={(name) => setFormData(prev => ({ ...prev, file_name: name }))}
              accept={formData.content_type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"}
              folder="content"
              maxSizeMB={formData.content_type === "video" ? 50 : 10}
            />
          )}

          <FileUpload
            label="Imagem de capa"
            value={formData.thumbnail_url || ""}
            onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
            displayName={formData.thumbnail_name || ""}
            onNameChange={(name) => setFormData(prev => ({ ...prev, thumbnail_name: name }))}
            accept="image/jpeg,image/png,image/webp,image/gif"
            folder="thumbnails"
            maxSizeMB={10}
          />

          <div className="form-group">
            <label className="label">Pontos *</label>
            <input required type="number" min="0" className="input" name="points_per_share" value={formData.points_per_share || 0} onChange={handleInputChange} />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
              <span>Destacar na Tela Inicial</span>
            </label>

            {editingContent && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) var(--space-md)" }}>
                <label className="toggle" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                  <div className="toggle__track" /><div className="toggle__thumb" />
                </label>
                <span style={{ fontSize: "0.9375rem", color: "var(--text)" }}>{formData.is_active ? "Ativo" : "Inativo"}</span>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
