"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const COMMON_ICONS = [
  "star", "emoji_events", "military_tech", "rocket", "group", "event", 
  "local_fire_department", "favorite", "thumb_up", "workspace_premium", "diamond", 
  "lightbulb", "school", "bolt", "celebration", "campaign", "verified", "shield", 
  "verified_user", "auto_awesome", "handshake", "volunteer_activism", "public", 
  "eco", "nature", "sports_esports", "flight_takeoff", "explore", "map", 
  "business_center", "work", "trending_up", "pie_chart", "show_chart", "leaderboard", 
  "flag", "emoji_objects", "medal", "hotel_class", "workspace_premium", "crown",
  "star_border", "star_half", "grade", "bookmark", "label", "sell", "card_giftcard",
  "redeem", "wallet", "payments", "monetization_on", "savings", "storefront",
  "shopping_cart", "local_shipping", "directions_car", "pedal_bike", "directions_run",
  "accessibility", "fitness_center", "sports_martial_arts", "self_improvement",
  "psychology", "health_and_safety", "medical_services", "local_hospital", "science",
  "biotech", "memory", "keyboard", "mouse", "desktop_windows", "smartphone", "watch",
  "tv", "videogame_asset", "headset", "mic", "music_note", "movie", "camera_alt",
  "palette", "brush", "format_paint", "architecture", "construction", "engineering",
  "directions_boat", "restaurant", "local_cafe", "local_bar", "local_pizza", "fastfood"
].sort();

export function IconPicker({ value, onChange, label = "Selecione um Ícone" }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return COMMON_ICONS;
    return COMMON_ICONS.filter(icon => icon.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const handleSelect = (icon: string) => {
    onChange(icon);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          padding: "var(--space-sm) var(--space-md)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-secondary)",
          cursor: "pointer",
          minHeight: 42
        }}
      >
        {value ? (
          <>
            <span className="material-icons" style={{ fontSize: 24, color: "var(--color-primary)" }}>{value}</span>
            <span>{value}</span>
          </>
        ) : (
          <span style={{ color: "var(--text-tertiary)" }}>Nenhum ícone selecionado</span>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: "var(--space-lg)"
        }}>
          <div className="card" style={{ 
            width: "100%", maxWidth: 500, maxHeight: "80vh",
            display: "flex", flexDirection: "column", padding: "var(--space-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
              <h3 className="text-title-3">Selecionar Ícone</h3>
              <button type="button" onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: "var(--space-md)" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Pesquisar ícone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
                autoFocus
              />
            </div>

            <div style={{ 
              overflowY: "auto", 
              flex: 1, 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", 
              gap: "var(--space-sm)",
              padding: "4px"
            }}>
              {filteredIcons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelect(icon)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-sm)",
                    border: icon === value ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: icon === value ? "var(--bg-secondary)" : "var(--bg-primary)",
                    cursor: "pointer",
                    aspectRatio: "1",
                    gap: 4
                  }}
                  title={icon}
                >
                  <span className="material-icons" style={{ fontSize: 28, color: icon === value ? "var(--color-primary)" : "var(--text-primary)" }}>
                    {icon}
                  </span>
                </button>
              ))}
              {filteredIcons.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "var(--space-xl)", color: "var(--text-tertiary)" }}>
                  Nenhum ícone encontrado
                </div>
              )}
            </div>
            
            <div style={{ marginTop: "var(--space-md)", textAlign: "center" }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => handleSelect("")}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Remover Ícone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
