/**
 * ═══════════════════════════════════════════════════════════════
 *  Types — TypeScript interfaces for all backend models
 *  Matches backend Pydantic schemas exactly
 * ═══════════════════════════════════════════════════════════════
 */

// ═══ AUTH ═══
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  referral_code?: string;
  consents?: ConsentInput[];
}

export interface ConsentInput {
  consent_type: ConsentType;
  accepted: boolean;
}

export type ConsentType = 'data_processing' | 'communication' | 'public_ranking';

// ═══ USER / PROFILE ═══
export interface Level {
  id: string;
  name: string;
  slug: string;
  color: string;
  order_index: number;
  min_points: number;
  min_missions: number;
  requires_approval: boolean;
}

export interface Region {
  id: string;
  name: string;
  state: string;
  city?: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  total_points: number;
  current_level?: Level;
  role: string;
  referral_code?: string;
  onboarding_completed: boolean;
  region_id?: string;
  city?: string;
}

export interface Consent {
  id: string;
  consent_type: ConsentType;
  accepted: boolean;
  version: string;
  created_at: string;
  updated_at?: string;
}

// ═══ MISSIONS ═══
export type MissionActionType =
  | 'EVENT_ATTENDANCE'
  | 'CONTENT_SHARE'
  | 'INVITE';

export type MissionRecurrence = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'PER_EVENT';

export type UserMissionStatus =
  | 'in_progress'
  | 'submitted'
  | 'pending_verification'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface MissionCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  action_type: MissionActionType;
  points_reward: number;
  required_count: number;
  mission_type?: string;
  recurrence: MissionRecurrence;
  is_featured: boolean;
  is_active: boolean;
  requires_verification: boolean;
  verification_type?: 'auto' | 'photo' | 'gps' | 'admin_approval';
  max_submissions?: number;
  max_daily_completions?: number;
  is_self_declared?: boolean;
  category?: MissionCategory;
  min_level_id?: string;
  min_level?: Level;
  start_date?: string;
  end_date?: string;
  steps?: string;
  created_at: string;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission: Mission;
  status: UserMissionStatus;
  progress_count: number;
  submission_count: number;
  evidence_url?: string;
  rejected_reason?: string;
  started_at: string;
  submitted_at?: string;
  completed_at?: string;
  points_awarded: number;
}

export interface MissionSubmitResult {
  status: UserMissionStatus;
  points_awarded?: number;
  message?: string;
}

// ═══ EVENTS ═══
export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  location_name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  online_url?: string;
  start_datetime: string;
  end_datetime?: string;
  max_capacity?: number;
  points_reward: number;
  cover_image_url?: string;
  is_featured: boolean;
  is_active: boolean;
  participants_count: number;
  checkin_start?: string;
  checkin_end?: string;
  created_at: string;
}

export interface CheckinData {
  checkin_code: string;
  latitude?: number;
  longitude?: number;
}

export interface CheckinResult {
  message: string;
  gamification?: {
    points_awarded: number;
    badges_awarded?: Badge[];
  };
}

// ═══ CONTENT ═══
export interface Content {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  content_url?: string;
  thumbnail_url?: string;
  share_text?: string;
  points_reward: number;
  is_active: boolean;
  is_featured?: boolean;
  share_count?: number;
  tags?: string[];
  created_at: string;
}

export interface ShareResult {
  message: string;
  points_awarded?: number;
  daily_shares_remaining?: number;
}

// ═══ GAMIFICATION ═══
export interface UserStats {
  total_points: number;
  current_level_name?: string;
  current_level_order: number;
  next_level_name?: string;
  points_to_next_level: number;
  progress_percentage: number;
  total_missions_completed: number;
  total_events_attended: number;
  total_badges: number;
  rank_position: number;
  total_referrals: number;
  level_pending_approval: boolean;
  recent_activities: Activity[];
  badges: UserBadge[];
}

export interface Activity {
  id: string;
  action_type: string;
  action_description?: string;
  points_awarded: number;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface UserBadge {
  id: string;
  badge: Badge;
  awarded_at: string;
  seen: boolean;
}

export interface PointTransaction {
  id: string;
  points: number;
  transaction_type: string;
  source_type: string;
  source_id?: string;
  description?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  total_points: number;
  level_name?: string;
  level_color?: string;
  city?: string;
}

export interface UserRank {
  rank: number;
  total_points: number;
  total_users: number;
}

// ═══ INVITATIONS ═══
export interface InviteCreate {
  invitee_email?: string;
  invitee_phone?: string;
}

export type InviteStatus = 'pending' | 'registered' | 'verified';

export interface Invitation {
  id: string;
  inviter_id: string;
  invitee_email?: string;
  invitee_phone?: string;
  invite_code: string;
  status: InviteStatus;
  created_at: string;
  registered_at?: string;
  verified_at?: string;
}

export interface InviteTracking {
  total_invites: number;
  pending: number;
  registered: number;
  verified: number;
  invitations: Invitation[];
}

// ═══ NOTIFICATIONS ═══
export interface Notification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  is_read: boolean;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

// ═══ PAGINATED RESPONSE ═══
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
