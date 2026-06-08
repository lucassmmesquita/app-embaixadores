/**
 * ═══════════════════════════════════════════════════════════════
 *  API Service — HTTP client for the backend
 *  BLK-03: Refresh token automático com single-flight pattern
 *  All endpoints typed — no `any` types
 * ═══════════════════════════════════════════════════════════════
 */

import type {
  AuthResponse,
  Badge,
  CheckinData,
  CheckinResult,
  Consent,
  Content,
  Event,
  InviteCreate,
  InviteTracking,
  Invitation,
  LeaderboardEntry,
  Level,
  Mission,
  MissionCategory,
  MissionSubmitResult,
  Notification,
  PaginatedResponse,
  PointTransaction,
  Region,
  RegisterData,
  ShareResult,
  UnreadCount,
  User,
  UserMission,
  UserRank,
  UserStats,
} from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  /** Internal: skip 401 retry (used by refresh itself) */
  _skipRetry?: boolean;
}

/** Error with HTTP status for consumers to differentiate error types */
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  /**
   * BLK-03: Single-flight refresh promise.
   * While a refresh is in-flight, all 401'd requests await this same promise.
   */
  private refreshing: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * BLK-03: Try to refresh the access token.
   * Uses single-flight pattern: concurrent calls share the same promise.
   */
  private async tryRefresh(): Promise<string | null> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        // Import lazily to avoid circular dependency
        const { useAuthStore } = await import('../stores/authStore');
        const rt = useAuthStore.getState().refreshToken;
        if (!rt) return null;

        const r = await this.refreshToken(rt);
        useAuthStore.getState().setTokens(r.access_token, r.refresh_token);
        return r.access_token;
      } catch {
        // Refresh failed — force logout
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().logout();
        return null;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, token, _skipRetry = false } = options;
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

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, config);
    } catch (e) {
      // Network error (no connection, DNS failure, etc.)
      throw new ApiError(
        'Sem conexão com o servidor. Verifique sua internet.',
        0,
        'NETWORK_ERROR'
      );
    }

    // BLK-03: If 401 and not already retrying and not the refresh endpoint itself
    if (
      response.status === 401 &&
      !_skipRetry &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register')
    ) {
      const newToken = await this.tryRefresh();
      if (newToken) {
        // Retry the original request with the new token
        return this.request<T>(endpoint, { ...options, token: newToken, _skipRetry: true });
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new ApiError(
        error.detail || `HTTP ${response.status}`,
        response.status,
        error.code
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ═══ AUTH ═══
  async register(data: RegisterData) {
    return this.request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async login(email: string, password: string) {
    return this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async socialLogin(provider: 'google' | 'apple', idToken: string) {
    return this.request<AuthResponse>('/api/v1/auth/social', {
      method: 'POST',
      body: { provider, id_token: idToken },
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ access_token: string; refresh_token: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      _skipRetry: true, // Never retry the refresh endpoint itself
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/api/v1/auth/password/forgot', {
      method: 'POST',
      body: { email },
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/api/v1/auth/password/reset', {
      method: 'POST',
      body: { token, new_password: newPassword },
    });
  }

  // ═══ USERS ═══
  async getMyProfile() {
    return this.request<User>('/api/v1/users/me');
  }

  async updateProfile(data: Partial<User>) {
    return this.request<User>('/api/v1/users/me', { method: 'PATCH', body: data });
  }

  async getLevels() {
    return this.request<Level[]>('/api/v1/users/levels/all');
  }

  async getRegions() {
    return this.request<Region[]>('/api/v1/users/regions/all');
  }

  async generateReferralCode() {
    return this.request<{ referral_code: string }>('/api/v1/users/me/referral-code', { method: 'POST' });
  }

  // ═══ CONSENTS (LGPD §8.1) ═══
  async getMyConsents() {
    return this.request<Consent[]>('/api/v1/users/me/consents');
  }

  async grantConsent(consent_type: string, accepted: boolean) {
    return this.request<Consent>('/api/v1/users/me/consents', {
      method: 'POST',
      body: { consent_type, accepted },
    });
  }

  async revokeConsent(consentType: string) {
    return this.request<{ message: string }>(`/api/v1/users/me/consents/${consentType}`, {
      method: 'DELETE',
    });
  }

  // ═══ DELETE ACCOUNT (LGPD §8.1) ═══
  async deleteAccount() {
    return this.request<{ message: string }>('/api/v1/users/me/account', {
      method: 'DELETE',
    });
  }

  // ═══ GAMIFICATION ═══
  async getMyStats() {
    return this.request<UserStats>('/api/v1/gamification/my-stats');
  }

  async getLeaderboard(limit = 50, regionId?: string, period?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (regionId) params.set('region_id', regionId);
    if (period) params.set('period', period);
    return this.request<LeaderboardEntry[]>(`/api/v1/gamification/leaderboard?${params}`);
  }

  async getMyRank(period?: string, regionId?: string) {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    if (regionId) params.set('region_id', regionId);
    const qs = params.toString();
    return this.request<UserRank>(`/api/v1/gamification/my-rank${qs ? `?${qs}` : ''}`);
  }

  async getPointsHistory(limit = 50, offset = 0) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    return this.request<PointTransaction[]>(`/api/v1/gamification/points-history?${params}`);
  }

  // ═══ MISSIONS ═══
  async getMissions(page = 1, categoryId?: string, featured?: boolean) {
    const params = new URLSearchParams({ page: page.toString() });
    if (categoryId) params.set('category_id', categoryId);
    if (featured !== undefined) params.set('is_featured', featured.toString());
    return this.request<PaginatedResponse<Mission>>(`/api/v1/missions?${params}`);
  }

  async getMission(id: string) {
    return this.request<Mission>(`/api/v1/missions/${id}`);
  }

  async getMyMissions() {
    return this.request<UserMission[]>('/api/v1/missions/my-missions');
  }

  async startMission(id: string) {
    return this.request<UserMission>(`/api/v1/missions/${id}/start`, { method: 'POST' });
  }

  async submitMission(id: string, evidenceUrl?: string, notes?: string) {
    return this.request<MissionSubmitResult>(`/api/v1/missions/${id}/submit`, {
      method: 'POST',
      body: { evidence_url: evidenceUrl, notes },
    });
  }

  async getMissionCategories() {
    return this.request<MissionCategory[]>('/api/v1/missions/categories');
  }

  // ═══ EVENTS ═══
  async getEvents(page = 1, eventType?: string, regionId?: string) {
    const params = new URLSearchParams({ page: page.toString() });
    if (eventType) params.set('event_type', eventType);
    if (regionId) params.set('region_id', regionId);
    return this.request<PaginatedResponse<Event>>(`/api/v1/events?${params}`);
  }

  async getEvent(id: string) {
    return this.request<Event>(`/api/v1/events/${id}`);
  }

  async registerForEvent(id: string) {
    return this.request<{ message: string; participant_id: string }>(`/api/v1/events/${id}/register`, { method: 'POST' });
  }

  async cancelEventRegistration(id: string) {
    return this.request<{ message: string }>(`/api/v1/events/${id}/register`, { method: 'DELETE' });
  }

  async checkinEvent(id: string, data: CheckinData) {
    return this.request<CheckinResult>(`/api/v1/events/${id}/checkin`, {
      method: 'POST',
      body: data,
    });
  }

  // ═══ CONTENT ═══
  async getContent(page = 1, contentType?: string) {
    const params = new URLSearchParams({ page: page.toString() });
    if (contentType) params.set('content_type', contentType);
    return this.request<PaginatedResponse<Content>>(`/api/v1/content?${params}`);
  }

  async getContentById(id: string) {
    return this.request<Content>(`/api/v1/content/${id}`);
  }

  async shareContent(id: string, platform = 'whatsapp') {
    return this.request<ShareResult>(`/api/v1/content/${id}/share?platform=${platform}`, { method: 'POST' });
  }

  // ═══ INVITATIONS ═══
  async createInvitation(data: InviteCreate) {
    return this.request<Invitation>('/api/v1/invitations', {
      method: 'POST',
      body: data,
    });
  }

  async getMyInvitations() {
    return this.request<InviteTracking>('/api/v1/invitations/my');
  }

  async validateInvitation(inviteCode: string) {
    return this.request<{ message: string }>(`/api/v1/invitations/${inviteCode}/validate`, {
      method: 'POST',
    });
  }

  // ═══ NOTIFICATIONS ═══
  async getNotifications(unreadOnly = false) {
    return this.request<Notification[]>(`/api/v1/notifications?unread_only=${unreadOnly}`);
  }

  async getUnreadCount() {
    return this.request<UnreadCount>('/api/v1/notifications/unread-count');
  }

  async markNotificationRead(id: string) {
    return this.request<Notification>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/api/v1/notifications/read-all', { method: 'PATCH' });
  }
}

export const api = new ApiService(API_BASE_URL);
export default api;
