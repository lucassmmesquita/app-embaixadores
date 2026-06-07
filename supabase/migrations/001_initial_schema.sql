-- ═══════════════════════════════════════════════════════════════
-- Rede de Embaixadores — Database Schema
-- Complete migration for Supabase PostgreSQL
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- 1. LEVELS (Gamification tiers)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    icon_url TEXT,
    color TEXT,
    perks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. REGIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id UUID REFERENCES regions(id),
    coordinator_id UUID, -- Will be FK to profiles after profiles is created
    city TEXT,
    state TEXT,
    geojson JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. PROFILES (Users)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    cpf TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'NB', 'O', 'PREFER_NOT_SAY')),
    region_id UUID REFERENCES regions(id),
    neighborhood TEXT,
    city TEXT,
    state TEXT DEFAULT 'SP',
    zip_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    current_level_id UUID REFERENCES levels(id),
    total_points INTEGER DEFAULT 0,
    role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'moderator', 'coordinator', 'admin', 'super_admin')),
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for regions.coordinator_id
ALTER TABLE regions ADD CONSTRAINT fk_regions_coordinator 
    FOREIGN KEY (coordinator_id) REFERENCES profiles(id);

-- ═══════════════════════════════════════════════════════════════
-- 4. BADGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    category TEXT DEFAULT 'achievement' CHECK (
        category IN ('achievement', 'level', 'special', 'event', 'milestone')
    ),
    rarity TEXT DEFAULT 'common' CHECK (
        rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')
    ),
    criteria_type TEXT,
    criteria_value INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    seen BOOLEAN DEFAULT false,
    UNIQUE(user_id, badge_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 5. MISSION CATEGORIES & MISSIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mission_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    color TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES mission_categories(id),
    mission_type TEXT DEFAULT 'one_time' CHECK (
        mission_type IN ('one_time', 'recurring', 'daily', 'weekly', 'challenge')
    ),
    action_type TEXT NOT NULL,
    points_reward INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    required_count INTEGER DEFAULT 1,
    min_level_id UUID REFERENCES levels(id),
    badge_reward_id UUID REFERENCES badges(id),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_participants INTEGER,
    requires_verification BOOLEAN DEFAULT false,
    verification_type TEXT CHECK (
        verification_type IN ('auto', 'photo', 'admin_approval', 'gps')
    ),
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    cover_image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    progress_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress' CHECK (
        status IN ('in_progress', 'pending_verification', 'completed', 'expired', 'cancelled')
    ),
    evidence_url TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    points_awarded INTEGER DEFAULT 0,
    UNIQUE(user_id, mission_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 6. EVENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'meeting' CHECK (
        event_type IN ('meeting', 'rally', 'training', 'community', 'online', 'exclusive')
    ),
    location_name TEXT,
    address TEXT,
    city TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    online_url TEXT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    max_capacity INTEGER,
    min_level_id UUID REFERENCES levels(id),
    points_reward INTEGER DEFAULT 0,
    cover_image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    region_id UUID REFERENCES regions(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered' CHECK (
        status IN ('registered', 'confirmed', 'attended', 'cancelled', 'no_show')
    ),
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. ACTIVITIES (Audit Log)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_description TEXT,
    points_awarded INTEGER DEFAULT 0,
    reference_type TEXT,
    reference_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action_type);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- 8. CONTENT (Materials Library)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (
        content_type IN ('image', 'video', 'document', 'link', 'post', 'infographic')
    ),
    file_url TEXT,
    thumbnail_url TEXT,
    category TEXT,
    tags TEXT[],
    share_text TEXT,
    points_per_share INTEGER DEFAULT 5,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    total_shares INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT CHECK (platform IN ('whatsapp', 'instagram', 'facebook', 'twitter', 'telegram', 'other')),
    shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 9. REFERRALS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES profiles(id),
    referred_id UUID NOT NULL REFERENCES profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rewarded')),
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    UNIQUE(referrer_id, referred_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 10. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info' CHECK (
        notification_type IN ('info', 'achievement', 'mission', 'event', 'level_up', 'system')
    ),
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    target_level_id UUID REFERENCES levels(id),
    target_region_id UUID REFERENCES regions(id),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(current_level_id);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_shares_user ON content_shares(user_id);

-- ═══════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_levels_updated_at BEFORE UPDATE ON levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
