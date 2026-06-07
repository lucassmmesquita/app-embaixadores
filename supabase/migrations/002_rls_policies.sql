-- ═══════════════════════════════════════════════════════════════
-- Row Level Security Policies
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ═══ PROFILES ═══
-- Users can read all active profiles (for leaderboard, etc.)
CREATE POLICY profiles_select ON profiles FOR SELECT
    USING (is_active = true);

-- Users can update their own profile
CREATE POLICY profiles_update ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own profile (on registration)
CREATE POLICY profiles_insert ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ═══ LEVELS (public read) ═══
CREATE POLICY levels_select ON levels FOR SELECT
    USING (true);

-- ═══ REGIONS (public read) ═══
CREATE POLICY regions_select ON regions FOR SELECT
    USING (is_active = true);

-- ═══ BADGES (public read) ═══
CREATE POLICY badges_select ON badges FOR SELECT
    USING (is_active = true);

-- ═══ USER_BADGES ═══
CREATE POLICY user_badges_select ON user_badges FOR SELECT
    USING (true);

CREATE POLICY user_badges_insert ON user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══ MISSIONS (public read for active) ═══
CREATE POLICY missions_select ON missions FOR SELECT
    USING (is_active = true);

-- ═══ MISSION CATEGORIES (public read) ═══
CREATE POLICY mission_categories_select ON mission_categories FOR SELECT
    USING (true);

-- ═══ USER_MISSIONS ═══
CREATE POLICY user_missions_select ON user_missions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_missions_insert ON user_missions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_missions_update ON user_missions FOR UPDATE
    USING (auth.uid() = user_id);

-- ═══ EVENTS (public read for active) ═══
CREATE POLICY events_select ON events FOR SELECT
    USING (is_active = true);

-- ═══ EVENT_PARTICIPANTS ═══
CREATE POLICY event_participants_select ON event_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY event_participants_insert ON event_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY event_participants_update ON event_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- ═══ ACTIVITIES ═══
CREATE POLICY activities_select ON activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY activities_insert ON activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══ CONTENT (public read) ═══
CREATE POLICY content_select ON content FOR SELECT
    USING (is_active = true);

-- ═══ CONTENT_SHARES ═══
CREATE POLICY content_shares_select ON content_shares FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY content_shares_insert ON content_shares FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ═══ REFERRALS ═══
CREATE POLICY referrals_select ON referrals FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- ═══ NOTIFICATIONS ═══
CREATE POLICY notifications_select ON notifications FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY notifications_update ON notifications FOR UPDATE
    USING (auth.uid() = user_id);
