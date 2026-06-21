"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Plus, Calendar, MapPin, AlertTriangle, CheckCircle2,
  Edit2, RefreshCw, X, Clock, Users, Star, Eye, EyeOff,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location_name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  online_url: string | null;
  start_datetime: string;
  end_datetime: string | null;
  max_capacity: number | null;
  points_reward: number;
  cover_image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  participants_count: number;
  checkin_code: string | null;
  checkin_start: string | null;
  checkin_end: string | null;
  created_at: string;
}

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  location_name: string;
  address: string;
  city: string;
  online_url: string;
  start_datetime: string;
  end_datetime: string;
  max_capacity: string;
  points_reward: string;
  cover_image_url: string;
  is_featured: boolean;
  checkin_radius_meters: string;
}

const EVENT_TYPES = [
  { value: "meeting", label: "Reunião" },
  { value: "rally", label: "Comício" },
  { value: "training", label: "Treinamento" },
  { value: "community", label: "Comunitário" },
  { value: "online", label: "Online" },
  { value: "exclusive", label: "Exclusivo" },
];

const EMPTY_FORM: EventFormData = {
  title: "",
  description: "",
  event_type: "meeting",
  location_name: "",
  address: "",
  city: "",
  online_url: "",
  start_datetime: "",
  end_datetime: "",
  max_capacity: "",
  points_reward: "50",
  cover_image_url: "",
  is_featured: false,
  checkin_radius_meters: "",
};

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: Event[] }>("/api/v1/events?page_size=50&upcoming_only=false");
      setEvents(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  // ═══ MODAL HANDLERS ═══

  const openModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type,
        location_name: event.location_name || "",
        address: event.address || "",
        city: event.city || "",
        online_url: event.online_url || "",
        start_datetime: toLocalDatetime(event.start_datetime),
        end_datetime: event.end_datetime ? toLocalDatetime(event.end_datetime) : "",
        max_capacity: event.max_capacity?.toString() || "",
        points_reward: event.points_reward.toString(),
        cover_image_url: event.cover_image_url || "",
        is_featured: event.is_featured,
        checkin_radius_meters: "",
      });
    } else {
      setEditingEvent(null);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        location_name: formData.location_name || null,
        address: formData.address || null,
        city: formData.city || null,
        online_url: formData.online_url || null,
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
        points_reward: parseInt(formData.points_reward) || 0,
        cover_image_url: formData.cover_image_url || null,
        is_featured: formData.is_featured,
        checkin_radius_meters: formData.checkin_radius_meters ? parseInt(formData.checkin_radius_meters) : null,
      };

      if (editingEvent) {
        await api.patch(`/api/v1/admin/events/${editingEvent.id}`, payload);
        showMessage("Evento atualizado com sucesso ✓");
      } else {
        const result = await api.post<{ event_id: string; checkin_code: string }>("/api/v1/admin/events", payload);
        showMessage(`Evento criado! Código check-in: ${result.checkin_code}`);
      }
      closeModal();
      loadEvents();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao salvar evento", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══ EVENT ACTIONS ═══

  const handleToggleActive = async (event: Event) => {
    try {
      await api.patch(`/api/v1/admin/events/${event.id}`, { is_active: !event.is_active });
      showMessage(event.is_active ? "Evento desativado" : "Evento ativado ✓");
      loadEvents();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao alterar status", true);
    }
  };

  const handleRegenerateCode = async (event: Event) => {
    try {
      const result = await api.post<{ checkin_code: string }>(`/api/v1/admin/events/${event.id}/regenerate-code`);
      showMessage(`Novo código: ${result.checkin_code}`);
      loadEvents();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao regenerar código", true);
    }
  };

  const isPast = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Eventos</h1>
          <p className="text-subhead text-secondary">{events.length} evento(s)</p>
        </div>
        <button className="btn btn-primary" id="create-event-btn" onClick={() => openModal()}>
          <Plus size={18} />
          Novo Evento
        </button>
      </div>

      {success && <div className="alert alert-success"><CheckCircle2 size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Data</th>
              <th>Local</th>
              <th>Inscritos</th>
              <th>Pontos</th>
              <th>Check-in</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhum evento encontrado. Clique em "Novo Evento" para criar.
                </td>
              </tr>
            ) : events.map((event) => (
              <tr key={event.id} style={{ opacity: event.is_active ? 1 : 0.5 }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Calendar size={16} color="var(--level-coordenador)" />
                    <div>
                      <span style={{ fontWeight: 500 }}>{event.title}</span>
                      {event.is_featured && (
                        <Star size={12} color="var(--color-warning)" style={{ marginLeft: 4, verticalAlign: "middle" }} />
                      )}
                      <div className="text-caption-1 text-tertiary">
                        {EVENT_TYPES.find(t => t.value === event.event_type)?.label || event.event_type}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ color: isPast(event.start_datetime) ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                    {new Date(event.start_datetime).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                    <div className="text-caption-1" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(event.start_datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {event.end_datetime && ` — ${new Date(event.end_datetime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  </div>
                </td>
                <td>
                  {event.location_name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
                      <MapPin size={14} /> {event.location_name}
                    </div>
                  ) : event.online_url ? (
                    <span className="text-caption-1" style={{ color: "var(--color-info)" }}>🌐 Online</span>
                  ) : "—"}
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={14} color="var(--text-tertiary)" />
                    <span>{event.participants_count || 0}</span>
                    {event.max_capacity && (
                      <span className="text-caption-1 text-tertiary">/ {event.max_capacity}</span>
                    )}
                  </div>
                </td>
                <td><span style={{ fontWeight: 600 }}>{event.points_reward}</span></td>
                <td>
                  {event.checkin_code ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <code style={{
                        background: "var(--surface-elevated)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                      }}>{event.checkin_code}</code>
                      <button
                        className="btn-icon"
                        onClick={() => handleRegenerateCode(event)}
                        title="Regenerar código"
                        style={{ padding: 2, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <RefreshCw size={14} color="var(--text-tertiary)" />
                      </button>
                    </div>
                  ) : "—"}
                </td>
                <td>
                  {isPast(event.start_datetime) ? (
                    <span className="badge badge-neutral">Encerrado</span>
                  ) : (
                    <span className={`badge ${event.is_active ? "badge-success" : "badge-neutral"}`}>
                      {event.is_active ? "Ativo" : "Inativo"}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn-icon"
                      onClick={() => openModal(event)}
                      title="Editar"
                      style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}
                    >
                      <Edit2 size={16} color="var(--color-primary)" />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleToggleActive(event)}
                      title={event.is_active ? "Desativar" : "Ativar"}
                      style={{ padding: 4, background: "none", border: "none", cursor: "pointer" }}
                    >
                      {event.is_active ? (
                        <EyeOff size={16} color="var(--text-tertiary)" />
                      ) : (
                        <Eye size={16} color="var(--color-success)" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ CREATE/EDIT MODAL ═══ */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            className="card"
            style={{ maxWidth: 600, width: "95%", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="text-headline" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <Calendar size={20} color="var(--color-primary)" />
                {editingEvent ? "Editar Evento" : "Novo Evento"}
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
                {/* Title */}
                <div className="form-group">
                  <label htmlFor="event-title" className="label">Título *</label>
                  <input
                    id="event-title"
                    className="input"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Ex: Reunião de Líderes Regionais"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label htmlFor="event-description" className="label">Descrição</label>
                  <textarea
                    id="event-description"
                    className="input"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detalhes do evento..."
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </div>

                {/* Type + Featured */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-base)", alignItems: "end" }}>
                  <div className="form-group">
                    <label htmlFor="event-type" className="label">Tipo</label>
                    <select
                      id="event-type"
                      className="input"
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleInputChange}
                    >
                      {EVENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", paddingBottom: "var(--space-sm)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={formData.is_featured}
                      onChange={handleInputChange}
                    />
                    <Star size={16} color="var(--color-warning)" />
                    <span className="text-subhead">Destaque</span>
                  </label>
                </div>

                {/* Date/Time Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-base)" }}>
                  <div className="form-group">
                    <label htmlFor="event-start" className="label">
                      <Clock size={14} style={{ verticalAlign: "middle" }} /> Início *
                    </label>
                    <input
                      id="event-start"
                      className="input"
                      type="datetime-local"
                      name="start_datetime"
                      value={formData.start_datetime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="event-end" className="label">Fim</label>
                    <input
                      id="event-end"
                      className="input"
                      type="datetime-local"
                      name="end_datetime"
                      value={formData.end_datetime}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label htmlFor="event-location" className="label">
                    <MapPin size={14} style={{ verticalAlign: "middle" }} /> Local
                  </label>
                  <input
                    id="event-location"
                    className="input"
                    name="location_name"
                    value={formData.location_name}
                    onChange={handleInputChange}
                    placeholder="Ex: Parque do Cocó"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-base)" }}>
                  <div className="form-group">
                    <label htmlFor="event-address" className="label">Endereço</label>
                    <input
                      id="event-address"
                      className="input"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Rua, número..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="event-city" className="label">Cidade</label>
                    <input
                      id="event-city"
                      className="input"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Ex: Fortaleza"
                    />
                  </div>
                </div>

                {/* Online URL */}
                <div className="form-group">
                  <label htmlFor="event-online" className="label">Link Online (se evento virtual)</label>
                  <input
                    id="event-online"
                    className="input"
                    name="online_url"
                    value={formData.online_url}
                    onChange={handleInputChange}
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                {/* Capacity + Points Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-base)" }}>
                  <div className="form-group">
                    <label htmlFor="event-capacity" className="label">
                      <Users size={14} style={{ verticalAlign: "middle" }} /> Capacidade
                    </label>
                    <input
                      id="event-capacity"
                      className="input"
                      type="number"
                      name="max_capacity"
                      value={formData.max_capacity}
                      onChange={handleInputChange}
                      placeholder="Ilimitado"
                      min={1}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="event-points" className="label">
                      <Star size={14} style={{ verticalAlign: "middle" }} /> Pontos
                    </label>
                    <input
                      id="event-points"
                      className="input"
                      type="number"
                      name="points_reward"
                      value={formData.points_reward}
                      onChange={handleInputChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="event-radius" className="label">Raio check-in (m)</label>
                    <input
                      id="event-radius"
                      className="input"
                      type="number"
                      name="checkin_radius_meters"
                      value={formData.checkin_radius_meters}
                      onChange={handleInputChange}
                      placeholder="Sem limite"
                      min={10}
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div className="form-group">
                  <label htmlFor="event-cover" className="label">URL da Imagem de Capa</label>
                  <input
                    id="event-cover"
                    className="input"
                    name="cover_image_url"
                    value={formData.cover_image_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="card-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", padding: "var(--space-base) var(--space-lg)" }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Criar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
