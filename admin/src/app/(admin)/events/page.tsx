"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Calendar, MapPin, AlertTriangle } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  location_name: string | null;
  city: string | null;
  start_datetime: string;
  end_datetime: string | null;
  is_active: boolean;
  checkin_code: string | null;
  points_reward: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.get<{ items: Event[] }>("/api/v1/events?page_size=50");
      setEvents(data.items || []);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr.detail || "Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="text-title-2">Gestão de Eventos</h1>
          <p className="text-subhead text-secondary">{events.length} evento(s)</p>
        </div>
        <button className="btn btn-primary" id="create-event-btn" onClick={() => { setInfo("Funcionalidade ainda não implementada"); setTimeout(() => setInfo(""), 3000); }}>
          <Plus size={18} />
          Novo Evento
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertTriangle size={18} />{error}</div>}
      {info && <div className="alert alert-info" style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", padding: "var(--space-md) var(--space-lg)", background: "var(--color-primary-50)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius-md)", color: "var(--color-primary-dark)" }}>{info}</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Data</th>
              <th>Local</th>
              <th>Pontos</th>
              <th>Check-in</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 20, width: "80%" }} /></td>
                ))}</tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhum evento encontrado
                </td>
              </tr>
            ) : events.map((event) => (
              <tr key={event.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                    <Calendar size={16} color="var(--level-coordenador)" />
                    <span style={{ fontWeight: 500 }}>{event.title}</span>
                  </div>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {new Date(event.start_datetime).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </td>
                <td>
                  {event.location_name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
                      <MapPin size={14} /> {event.location_name}
                    </div>
                  ) : "—"}
                </td>
                <td><span style={{ fontWeight: 600 }}>{event.points_reward}</span></td>
                <td>
                  {event.checkin_code ? (
                    <code style={{
                      background: "var(--surface-elevated)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                    }}>{event.checkin_code}</code>
                  ) : "—"}
                </td>
                <td>
                  <span className={`badge ${event.is_active ? "badge-success" : "badge-neutral"}`}>
                    {event.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
