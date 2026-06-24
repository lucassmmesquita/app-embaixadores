"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, FileText, AlertTriangle, Edit2, Trash2, X, Share2 } from "lucide-react";

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  file_url: string | null;
  thumbnail_url: string | null;
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
  const [info, setInfo] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<Partial<Content>>({
    title: "",
    description: "",
    content_type: "post",
    file_url: "",
    thumbnail_url: "",
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
      // Fallback: tipos já podem ter sido carregados em cache
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
        thumbnail_url: content.thumbnail_url || "",
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
        thumbnail_url: "",
        category: "",
        share_text: "",
        points_per_share: 5,
        is_featured: false,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContent(null);
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
    
    try {
      // API payload - treat empty strings as null where appropriate
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
      showMessage(apiErr.detail || "Erro ao salvar conteúdo", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Conteúdo</h1>
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
        <table className="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Pontos/Share</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhum material encontrado
                </td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <FileText size={16} color="var(--color-primary)" />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>{item.title}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        <Share2 size={10} /> {item.total_shares} compartilhamentos
                        {item.is_featured && <span style={{ marginLeft: "4px", color: "var(--color-primary)", fontWeight: 600 }}>· Destaque</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-neutral">{contentTypes.find(t => t.value === item.content_type)?.label || item.content_type}</span>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {item.category || "—"}
                </td>
                <td><span style={{ fontWeight: 600 }}>{item.points_per_share} pts</span></td>
                <td>
                  <span className={`badge ${item.is_active ? "badge-success" : "badge-neutral"}`}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)" }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32 }}
                      onClick={() => openModal(item)}
                    >
                      <Edit2 size={14} />
                    </button>
                    {item.is_active && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32, borderColor: "var(--color-error)", color: "var(--color-error)" }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "var(--space-lg)"
        }}>
          <div className="card" style={{ 
            width: "100%", maxWidth: 650, maxHeight: "90vh", overflowY: "auto",
            display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-lg)", borderBottom: "1px solid var(--border-color)" }}>
              <h2 className="text-title-3">{editingContent ? "Editar Material" : "Novo Material"}</h2>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input required type="text" className="form-control" name="title" value={formData.title || ""} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Descrição (Opcional)</label>
                <textarea className="form-control" name="description" value={formData.description || ""} onChange={handleInputChange} rows={2} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Tipo de Conteúdo *</label>
                  <select required className="form-control" name="content_type" value={formData.content_type || ""} onChange={handleInputChange}>
                    {contentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Categoria (Ex: Marketing)</label>
                  <input type="text" className="form-control" name="category" value={formData.category || ""} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">URL do Arquivo / Link Original</label>
                <input type="url" className="form-control" name="file_url" value={formData.file_url || ""} onChange={handleInputChange} placeholder="https://..." />
              </div>

              <div className="form-group">
                <label className="form-label">URL da Thumbnail (Capa)</label>
                <input type="url" className="form-control" name="thumbnail_url" value={formData.thumbnail_url || ""} onChange={handleInputChange} placeholder="https://..." />
              </div>

              <div className="form-group">
                <label className="form-label">Texto sugerido para compartilhamento</label>
                <textarea className="form-control" name="share_text" value={formData.share_text || ""} onChange={handleInputChange} rows={2} placeholder="Olha que legal esse material que estou compartilhando..." />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="form-group">
                  <label className="form-label">Pontos por Compartilhar *</label>
                  <input required type="number" min="0" className="form-control" name="points_per_share" value={formData.points_per_share || 0} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                  <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
                  <span>Destacar na Tela Inicial</span>
                </label>
                
                {editingContent && (
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", cursor: "pointer" }}>
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                    <span>Material Ativo</span>
                  </label>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-md)", marginTop: "var(--space-lg)", borderTop: "1px solid var(--border-color)", paddingTop: "var(--space-lg)" }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
