/**
 * ═══════════════════════════════════════════════════════════════
 *  API Service — HTTP client for the backend
 * ═══════════════════════════════════════════════════════════════
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string | null;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, token } = options;
    const authToken = token || this.token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ═══ AUTH ═══
  async register(data: { full_name: string; email: string; password: string; phone?: string; referral_code?: string }) {
    return this.request<{ access_token: string; refresh_token: string; user_id: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string; user_id: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ access_token: string; refresh_token: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  }

  // ═══ USERS ═══
  async getMyProfile() {
    return this.request<any>('/api/v1/users/me');
  }

  async updateProfile(data: any) {
    return this.request<any>('/api/v1/users/me', { method: 'PATCH', body: data });
  }

  async getLevels() {
    return this.request<any[]>('/api/v1/users/levels/all');
  }

  async getRegions() {
    return this.request<any[]>('/api/v1/users/regions/all');
  }

  async generateReferralCode() {
    return this.request<{ referral_code: string }>('/api/v1/users/me/referral-code', { method: 'POST' });
  }

  // ═══ GAMIFICATION ═══
  async getMyStats() {
    return this.request<any>('/api/v1/gamification/my-stats');
  }

  async getLeaderboard(limit = 50, regionId?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (regionId) params.set('region_id', regionId);
    return this.request<any[]>(`/api/v1/gamification/leaderboard?${params}`);
  }

  // ═══ MISSIONS ═══
  async getMissions(page = 1, categoryId?: string, featured?: boolean) {
    const params = new URLSearchParams({ page: page.toString() });
    if (categoryId) params.set('category_id', categoryId);
    if (featured !== undefined) params.set('is_featured', featured.toString());
    return this.request<any>(`/api/v1/missions?${params}`);
  }

  async getMission(id: string) {
    return this.request<any>(`/api/v1/missions/${id}`);
  }

  async getMyMissions() {
    return this.request<any[]>('/api/v1/missions/my-missions');
  }

  async startMission(id: string) {
    return this.request<any>(`/api/v1/missions/${id}/start`, { method: 'POST' });
  }

  async submitMission(id: string, evidenceUrl?: string) {
    return this.request<any>(`/api/v1/missions/${id}/submit`, {
      method: 'POST',
      body: { evidence_url: evidenceUrl },
    });
  }

  async getMissionCategories() {
    return this.request<any[]>('/api/v1/missions/categories');
  }

  // ═══ EVENTS ═══
  async getEvents(page = 1, eventType?: string) {
    const params = new URLSearchParams({ page: page.toString() });
    if (eventType) params.set('event_type', eventType);
    return this.request<any>(`/api/v1/events?${params}`);
  }

  async getEvent(id: string) {
    return this.request<any>(`/api/v1/events/${id}`);
  }

  async registerForEvent(id: string) {
    return this.request<any>(`/api/v1/events/${id}/register`, { method: 'POST' });
  }

  async checkinEvent(id: string) {
    return this.request<any>(`/api/v1/events/${id}/checkin`, { method: 'POST' });
  }

  // ═══ CONTENT ═══
  async getContent(page = 1, contentType?: string) {
    const params = new URLSearchParams({ page: page.toString() });
    if (contentType) params.set('content_type', contentType);
    return this.request<any>(`/api/v1/content?${params}`);
  }

  async shareContent(id: string, platform = 'whatsapp') {
    return this.request<any>(`/api/v1/content/${id}/share?platform=${platform}`, { method: 'POST' });
  }

  // ═══ NOTIFICATIONS ═══
  async getNotifications(unreadOnly = false) {
    return this.request<any[]>(`/api/v1/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/api/v1/notifications/read-all', { method: 'PATCH' });
  }
}

export const api = new ApiService(API_BASE_URL);
export default api;
