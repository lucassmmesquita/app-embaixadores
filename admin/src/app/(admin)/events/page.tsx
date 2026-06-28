"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  Plus, Calendar, MapPin, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Users, Star, Search, X,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { FileUpload } from "@/components/ui/FileUpload";

// ═══ INLINE LOCATION PICKER (Leaflet via CDN) ═══

declare global {
  interface Window { L: any; }
}

let leafletLoaded = false;
function loadLeaflet(): Promise<void> {
  if (leafletLoaded && typeof window !== "undefined" && window.L) return Promise.resolve();
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => { leafletLoaded = true; resolve(); };
      document.head.appendChild(script);
    } else if (window.L) {
      leafletLoaded = true;
      resolve();
    }
  });
}

function LocationPicker({ latitude, longitude, locationName, address, city, onChange }: {
  latitude: string; longitude: string; locationName: string; address: string; city: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const defaultLat = latitude ? parseFloat(latitude) : -15.78;
  const defaultLng = longitude ? parseFloat(longitude) : -47.93;
  const hasCoords = !!latitude && !!longitude;

  // Build search query from form fields
  const searchParts = [locationName, address, city].filter(Boolean);
  const searchPreview = searchParts.join(", ");

  useEffect(() => { loadLeaflet().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: [defaultLat, defaultLng], zoom: hasCoords ? 15 : 4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>', maxZoom: 19,
    }).addTo(map);

    if (hasCoords) {
      markerRef.current = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChange(p.lat.toFixed(8), p.lng.toFixed(8));
      });
    }

    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current.getLatLng();
          onChange(p.lat.toFixed(8), p.lng.toFixed(8));
        });
      }
      onChange(lat.toFixed(8), lng.toFixed(8));
      setSearchMessage(null);
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, [ready]);

  const placeMarker = (lat: number, lng: number, zoom = 15) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([lat, lng], zoom);
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChange(p.lat.toFixed(8), p.lng.toFixed(8));
      });
    }
    onChange(lat.toFixed(8), lng.toFixed(8));
  };

  const searchNominatim = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=br`);
      const results = await resp.json();
      if (results.length > 0) {
        return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      }
    } catch (e) { console.error(e); }
    return null;
  };

  const handleLocate = async () => {
    if (!searchPreview.trim() || !mapInstanceRef.current) return;
    setSearching(true);
    setSearchMessage(null);

    // Try full address first
    let result = await searchNominatim(searchPreview);
    if (result) {
      placeMarker(result.lat, result.lng);
      setSearchMessage({ text: "✓ Endereço localizado. Ajuste o marcador se necessário.", isError: false });
      setSearching(false);
      return;
    }

    // Fallback: try city only
    if (city) {
      result = await searchNominatim(city + ", Brasil");
      if (result) {
        mapInstanceRef.current.setView([result.lat, result.lng], 12);
        setSearchMessage({
          text: `Endereço exato não encontrado. Mapa centralizado em "${city}". Clique no mapa para definir a localização.`,
          isError: true,
        });
        setSearching(false);
        return;
      }
    }

    setSearchMessage({ text: "Não foi possível localizar o endereço. Clique diretamente no mapa para definir a localização.", isError: true });
    setSearching(false);
  };

  const handleClear = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onChange("", "");
    setSearchMessage(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      <label className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={14} /> Localização no Mapa
      </label>

      {/* Address preview + action buttons */}
      {searchPreview ? (
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <div style={{
            flex: 1, padding: "8px 12px",
            background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)",
            fontSize: "0.875rem", color: "var(--text-secondary)",
          }}>
            📍 {searchPreview}
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleLocate} disabled={searching}
            style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <Search size={14} />{searching ? "Buscando..." : "Localizar no mapa"}
          </button>
          {hasCoords && (
            <button type="button" className="btn btn-secondary" onClick={handleClear} title="Limpar marcador" style={{ padding: "6px 10px" }}>
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="text-caption-1 text-tertiary" style={{ fontStyle: "italic" }}>
          Preencha o endereço acima para localizar no mapa, ou clique diretamente no mapa.
        </div>
      )}

      {/* Search result message */}
      {searchMessage && (
        <div style={{
          padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem",
          background: searchMessage.isError ? "var(--color-warning-bg, rgba(255,170,0,0.1))" : "var(--color-success-bg, rgba(0,180,80,0.1))",
          color: searchMessage.isError ? "var(--color-warning, #b8860b)" : "var(--color-success, #0a8a3e)",
          border: `1px solid ${searchMessage.isError ? "var(--color-warning, #daa520)" : "var(--color-success, #2da44e)"}22`,
        }}>
          {searchMessage.text}
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} style={{ height: 280, borderRadius: "var(--radius-md)", border: "1px solid var(--border-primary)", background: "var(--bg-secondary)", cursor: "crosshair" }} />

      {/* Coords display */}
      {hasCoords && (
        <div className="text-caption-1 text-secondary" style={{ display: "flex", gap: "var(--space-lg)" }}>
          <span>Lat: {parseFloat(latitude).toFixed(6)}</span>
          <span>Lng: {parseFloat(longitude).toFixed(6)}</span>
        </div>
      )}
    </div>
  );
}

// ═══ END LOCATION PICKER ═══

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

interface Participant {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  registered_at: string | null;
  check_in_at: string | null;
}

interface ParticipantsData {
  event: {
    id: string;
    title: string;
    event_type: string;
    start_datetime: string;
    end_datetime: string | null;
    location_name: string | null;
    max_capacity: number | null;
    points_reward: number;
  };
  summary: {
    total: number;
    by_status: Record<string, number>;
  };
  participants: Participant[];
}

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  location_name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  online_url: string;
  start_datetime: string;
  end_datetime: string;
  max_capacity: string;
  points_reward: string;
  cover_image_url: string;
  is_featured: boolean;
  is_active: boolean;
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
  latitude: "",
  longitude: "",
  online_url: "",
  start_datetime: "",
  end_datetime: "",
  max_capacity: "",
  points_reward: "50",
  cover_image_url: "",
  is_featured: false,
  is_active: true,
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
  const [modalError, setModalError] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Participants modal state
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantsData, setParticipantsData] = useState<ParticipantsData | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [isPresencial, setIsPresencial] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: Event[] }>("/api/v1/admin/events?page_size=50");
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
      const presencial = !!(event.location_name || event.address || event.latitude || event.longitude);
      setIsPresencial(presencial);
      setFormData({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type,
        location_name: event.location_name || "",
        address: event.address || "",
        city: event.city || "",
        latitude: event.latitude?.toString() || "",
        longitude: event.longitude?.toString() || "",
        online_url: event.online_url || "",
        start_datetime: toLocalDatetime(event.start_datetime),
        end_datetime: event.end_datetime ? toLocalDatetime(event.end_datetime) : "",
        max_capacity: event.max_capacity?.toString() || "",
        points_reward: event.points_reward.toString(),
        cover_image_url: event.cover_image_url || "",
        is_featured: event.is_featured,
        is_active: event.is_active,
        checkin_radius_meters: "",
      });
    } else {
      setEditingEvent(null);
      setIsPresencial(false);
      setFormData(EMPTY_FORM);
    }
    setIsModalOpen(true);
    setModalError("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setModalError("");
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
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        online_url: formData.online_url || null,
        start_datetime: formData.start_datetime ? new Date(formData.start_datetime).toISOString() : null,
        end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
        max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : null,
        points_reward: parseInt(formData.points_reward) || 0,
        cover_image_url: formData.cover_image_url || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
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
      setModalError(apiErr.detail || "Erro ao salvar evento");
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

  const loadParticipants = async (eventId: string) => {
    setParticipantsLoading(true);
    setShowParticipants(true);
    try {
      const data = await api.get<ParticipantsData>(`/api/v1/admin/events/${eventId}/participants`);
      setParticipantsData(data);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      showMessage(apiErr.detail || "Erro ao carregar inscritos", true);
      setShowParticipants(false);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const isPast = (dateStr: string) => new Date(dateStr) < new Date();

  const eventColumns: Column<Event>[] = [
    { key: "title", label: "Evento", sortable: true, primary: true, render: (val) => (
      <span style={{ fontWeight: 500 }}>{String(val)}</span>
    )},
    { key: "event_type", label: "Tipo", sortable: true, hideOnMobile: true, render: (val) => (
      <span style={{ color: "var(--text-secondary)" }}>{EVENT_TYPES.find(t => t.value === val)?.label || String(val)}</span>
    )},
    { key: "start_datetime", label: "Data", sortable: true, render: (val) => (
      <span style={{ color: isPast(String(val)) ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
        {new Date(String(val)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}{" "}
        {new Date(String(val)).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    )},
    { key: "location_name", label: "Local", hideOnMobile: true, render: (val, row) => (
      val ? <span style={{ color: "var(--text-secondary)" }}>{String(val)}</span> : row.online_url ? <span style={{ color: "var(--color-info)" }}>🌐 Online</span> : <span>—</span>
    )},
    { key: "participants_count", label: "Inscritos", sortable: true, align: "right", render: (val, row) => (
      <span>{String(val || 0)}{row.max_capacity ? <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>/{String(row.max_capacity)}</span> : null}</span>
    )},
    { key: "points_reward", label: "Pontos", sortable: true, align: "right", render: (val) => <span style={{ fontWeight: 600 }}>{String(val)}</span> },
    { key: "is_active", label: "Status", sortable: true, render: (_val, row) => (
      <label className="toggle" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={!!row.is_active} onChange={() => handleToggleActive(row)} />
        <div className="toggle__track" /><div className="toggle__thumb" />
      </label>
    )},
    { key: "id", label: "", align: "right" as const, hideOnMobile: true, render: (_val: unknown, row: Event) => (
      <button className="btn btn-outline" style={{ padding: "0.25rem 0.5rem", height: "auto", minHeight: 32, fontSize: "0.8125rem" }} onClick={(e) => { e.stopPropagation(); loadParticipants(row.id); }} title="Ver inscritos">Inscritos</button>
    )},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-md)" }}>
        <div>
          <h1 className="text-title-2">Eventos</h1>
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
        <DataTable columns={eventColumns} data={events} loading={loading} emptyMessage="Nenhum evento encontrado" emptyIcon={<Calendar size={32} />} onRowClick={(row) => openModal(row)} defaultSortKey="start_datetime" defaultSortDirection="desc" id="events-table" />
      </div>

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingEvent ? "Editar Evento" : "Novo Evento"}
        icon={<Calendar size={20} color="var(--color-primary)" />}
        size="lg"
        id="event-modal"
        error={modalError}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" form="event-form" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-base)" }}>
          {/* Check-in Code (only when editing) */}
          {editingEvent && editingEvent.checkin_code && (
            <div className="form-group">
              <label className="label">Código de Check-in</label>
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <input className="input" value={editingEvent.checkin_code} readOnly style={{ flex: 1, letterSpacing: "0.1em", fontWeight: 600 }} />
                <button type="button" className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(editingEvent.checkin_code || ""); showMessage("Código copiado!"); }}>Copiar</button>
              </div>
            </div>
          )}

          {/* Título */}
          <div className="form-group">
            <label htmlFor="event-title" className="label">Título <span style={{ color: "var(--color-danger)" }}>*</span></label>
            <input id="event-title" className="input" name="title" value={formData.title} onChange={handleInputChange} placeholder="Ex: Reunião de Líderes Regionais" required />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label htmlFor="event-description" className="label">Descrição</label>
            <textarea id="event-description" className="input" name="description" value={formData.description} onChange={handleInputChange} placeholder="Detalhes do evento..." rows={3} style={{ resize: "vertical" }} />
          </div>

          {/* Date/Time Row */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="event-start" className="label"><Clock size={14} style={{ verticalAlign: "middle" }} /> Início <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input id="event-start" className="input" type="datetime-local" name="start_datetime" value={formData.start_datetime} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="event-end" className="label">Fim</label>
              <input id="event-end" className="input" type="datetime-local" name="end_datetime" value={formData.end_datetime} onChange={handleInputChange} />
            </div>
          </div>

          {/* Capacidade + Pontos */}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label htmlFor="event-capacity" className="label">Capacidade</label>
              <input id="event-capacity" className="input" type="number" name="max_capacity" value={formData.max_capacity} onChange={handleInputChange} placeholder="Ilimitado" min={1} />
            </div>
            <div className="form-group">
              <label htmlFor="event-points" className="label">Pontos</label>
              <input id="event-points" className="input" type="number" name="points_reward" value={formData.points_reward} onChange={handleInputChange} min={0} />
            </div>
          </div>

          {/* Imagem de Capa */}
          <FileUpload
            label="Imagem de capa"
            value={formData.cover_image_url}
            onChange={(url) => setFormData(prev => ({ ...prev, cover_image_url: url }))}
            accept="image/jpeg,image/png,image/webp,image/gif"
            folder="thumbnails"
            maxSizeMB={10}
          />

          {/* Type + Featured */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-base)", alignItems: "end" }}>
            <div className="form-group">
              <label htmlFor="event-type" className="label">Tipo</label>
              <select id="event-type" className="input" name="event_type" value={formData.event_type} onChange={handleInputChange}>
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <label className="checkbox-label" style={{ paddingBottom: "var(--space-sm)" }}>
              <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
              <Star size={16} color="var(--color-warning)" />
              <span>Destacar na tela inicial</span>
            </label>
          </div>

          {/* Modalidade: Presencial/Online como select */}
          <div className="form-group">
            <label className="label">Modalidade</label>
            <select className="input" value={isPresencial ? "presencial" : "online"} onChange={(e) => { const pres = e.target.value === "presencial"; setIsPresencial(pres); if (!pres) { setFormData(prev => ({ ...prev, location_name: "", address: "", city: "", latitude: "", longitude: "", checkin_radius_meters: "" })); } else { setFormData(prev => ({ ...prev, online_url: "" })); } }}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>

          {/* Location fields (presencial) */}
          {isPresencial && (
            <>
              <div className="form-group">
                <label htmlFor="event-location" className="label">Nome do Local</label>
                <input id="event-location" className="input" name="location_name" value={formData.location_name} onChange={handleInputChange} placeholder="Ex: Parque do Cocó" />
              </div>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label htmlFor="event-address" className="label">Endereço</label>
                  <input id="event-address" className="input" name="address" value={formData.address} onChange={handleInputChange} placeholder="Rua, número..." />
                </div>
                <div className="form-group">
                  <label htmlFor="event-city" className="label">Cidade</label>
                  <input id="event-city" className="input" name="city" value={formData.city} onChange={handleInputChange} placeholder="Ex: Fortaleza" />
                </div>
              </div>
              <LocationPicker latitude={formData.latitude} longitude={formData.longitude} locationName={formData.location_name} address={formData.address} city={formData.city} onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))} />
              <div className="form-group">
                <label htmlFor="event-radius" className="label">Raio de check-in (metros)</label>
                <input id="event-radius" className="input" type="number" name="checkin_radius_meters" value={formData.checkin_radius_meters} onChange={handleInputChange} placeholder="Sem limite" min={10} />
              </div>
              {formData.checkin_radius_meters && (!formData.latitude || !formData.longitude) && (
                <div className="alert alert-warning" style={{ margin: 0 }}>⚠️ Raio de check-in configurado sem coordenadas. Selecione a localização no mapa.</div>
              )}
            </>
          )}

          {/* Online URL */}
          {!isPresencial && (
            <div className="form-group">
              <label htmlFor="event-online" className="label">Link do evento</label>
              <input id="event-online" className="input" name="online_url" value={formData.online_url} onChange={handleInputChange} placeholder="https://meet.google.com/..." />
            </div>
          )}

          {/* Ativo (only when editing) */}
          {editingEvent && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0" }}>
              <label className="toggle" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} />
                <div className="toggle__track" /><div className="toggle__thumb" />
              </label>
              <span style={{ fontSize: "0.9375rem", color: "var(--text)" }}>{formData.is_active ? "Ativo" : "Inativo"}</span>
            </div>
          )}

        </form>
      </Modal>

      <Modal
        open={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Inscritos"
        icon={<Users size={20} color="var(--color-primary)" />}
        size="lg"
        loading={participantsLoading}
        id="participants-modal"
      >
        {participantsData ? (
          <>
            {/* Event Summary */}
            <div style={{ marginBottom: "var(--space-base)", paddingBottom: "var(--space-base)", borderBottom: "1px solid var(--separator)" }}>
              <h4 className="text-headline">{participantsData.event.title}</h4>
              <div style={{ display: "flex", gap: "var(--space-lg)", marginTop: "var(--space-sm)", flexWrap: "wrap" }}>
                <span className="text-caption-1 text-secondary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={13} />
                  {new Date(participantsData.event.start_datetime).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {participantsData.event.location_name && (
                  <span className="text-caption-1 text-secondary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} />
                    {participantsData.event.location_name}
                  </span>
                )}
                {participantsData.event.max_capacity && (
                  <span className="text-caption-1 text-secondary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={13} />
                    {participantsData.summary.total}/{participantsData.event.max_capacity}
                  </span>
                )}
                {participantsData.event.points_reward > 0 && (
                  <span className="text-caption-1 text-secondary" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={13} />
                    {participantsData.event.points_reward} pontos
                  </span>
                )}
              </div>
            </div>

            {/* Status Summary */}
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-base)" }}>
              <span className="badge badge-primary" style={{ fontSize: "0.8125rem" }}>
                Total: {participantsData.summary.total}
              </span>
              {Object.entries(participantsData.summary.by_status).map(([status, count]) => (
                <span
                  key={status}
                  className={`badge ${status === "attended" ? "badge-success" : status === "cancelled" ? "badge-danger" : "badge-neutral"}`}
                  style={{ fontSize: "0.8125rem" }}
                >
                  {status === "registered" ? "Inscritos" : status === "attended" ? "Check-in" : status === "cancelled" ? "Cancelados" : status}: {count}
                </span>
              ))}
            </div>

            {/* Participants Table */}
            {participantsData.participants.length === 0 ? (
              <div style={{ padding: "var(--space-xl)", textAlign: "center" }}>
                <p className="text-subhead text-tertiary">Nenhum inscrito ainda</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ fontSize: "0.875rem", width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Inscrição</th>
                      <th>Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantsData.participants.map((p) => (
                      <tr key={p.id}>
                        <td><span className="text-subhead">{p.full_name || "—"}</span></td>
                        <td className="text-caption-1 text-secondary">{p.email || "—"}</td>
                        <td>
                          <span className={`badge ${p.status === "attended" ? "badge-success" : p.status === "cancelled" ? "badge-danger" : "badge-neutral"}`}>
                            {p.status === "registered" ? "Inscrito" : p.status === "attended" ? "✓ Check-in" : p.status === "cancelled" ? "Cancelado" : p.status}
                          </span>
                        </td>
                        <td className="text-caption-1 text-secondary">
                          {p.registered_at ? new Date(p.registered_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="text-caption-1 text-secondary">
                          {p.check_in_at ? new Date(p.check_in_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </Modal>
    </div>
  );
}
