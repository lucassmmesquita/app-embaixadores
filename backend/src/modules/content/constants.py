"""
═══════════════════════════════════════════════════════════════
  Content Module — Constants (Single Source of Truth)
  All content types are defined here and consumed by:
  - Backend API (landing pages, validation)
  - Admin Panel (dropdown, badges)
  - App Mobile (filters, icons, labels)
═══════════════════════════════════════════════════════════════
"""

# Each content type has:
#   value     — stored in the database
#   label     — human-readable label (pt-BR)
#   icon      — MaterialIcons name (used by React Native app)
#   emoji     — emoji icon (used by server-rendered landing pages)
#   color     — hex color (used by app for badges/headers)
#   filterable — whether it appears in the app's filter bar

CONTENT_TYPES = [
    {
        "value": "post",
        "label": "Post",
        "icon": "feed",
        "emoji": "📝",
        "color": "#2171BA",
        "filterable": True,
    },
    {
        "value": "video",
        "label": "Vídeo",
        "icon": "videocam",
        "emoji": "🎬",  
        "color": "#E33431",
        "filterable": True,
    },
    {
        "value": "image",
        "label": "Imagem",
        "icon": "image",
        "emoji": "🖼️",
        "color": "#4DAA35",
        "filterable": True,
    },
]

# ═══ Helper dicts for fast lookups ═══
CONTENT_TYPE_VALUES = [ct["value"] for ct in CONTENT_TYPES]
CONTENT_TYPE_LABELS = {ct["value"]: ct["label"] for ct in CONTENT_TYPES}
CONTENT_TYPE_EMOJIS = {ct["value"]: ct["emoji"] for ct in CONTENT_TYPES}
