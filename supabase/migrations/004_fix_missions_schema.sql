-- ═══════════════════════════════════════════════════════════════
-- 004_fix_missions_schema.sql
-- BLK-01: Alinha schema SQL com modelos Python
-- Resolve divergência que quebra submit/verify/filtros
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1) missions: Renomear mission_type → recurrence e re-padronizar enum
-- ─────────────────────────────────────────────────────────────
ALTER TABLE missions RENAME COLUMN mission_type TO recurrence;
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_mission_type_check;

-- Normalizar valores existentes para o vocabulário Python
UPDATE missions SET recurrence = UPPER(recurrence);
UPDATE missions SET recurrence = 'ONE_TIME' WHERE recurrence IN ('ONE_TIME', 'RECURRING', 'CHALLENGE');
UPDATE missions SET recurrence = 'DAILY' WHERE recurrence = 'DAILY';
UPDATE missions SET recurrence = 'WEEKLY' WHERE recurrence = 'WEEKLY';

ALTER TABLE missions ADD CONSTRAINT missions_recurrence_check
  CHECK (recurrence IN ('ONE_TIME', 'DAILY', 'WEEKLY', 'PER_EVENT'));

-- ─────────────────────────────────────────────────────────────
-- 2) missions: Campos de submissão/antifraude usados pelo service
-- ─────────────────────────────────────────────────────────────
ALTER TABLE missions ADD COLUMN IF NOT EXISTS max_submissions INTEGER NOT NULL DEFAULT 3;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS max_daily_completions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_self_declared BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 3) user_missions: Novo conjunto de status + colunas do service
-- ─────────────────────────────────────────────────────────────

-- Remover UNIQUE constraint (missões recorrentes geram múltiplos registros)
ALTER TABLE user_missions DROP CONSTRAINT IF EXISTS user_missions_user_id_mission_id_key;

-- Corrigir status enum
ALTER TABLE user_missions DROP CONSTRAINT IF EXISTS user_missions_status_check;
UPDATE user_missions SET status = 'submitted' WHERE status = 'pending_verification';
UPDATE user_missions SET status = 'completed' WHERE status NOT IN
  ('in_progress', 'submitted', 'completed', 'rejected');

ALTER TABLE user_missions ADD CONSTRAINT user_missions_status_check
  CHECK (status IN ('in_progress', 'submitted', 'completed', 'rejected'));

-- Colunas que o Python service referencia
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS submission_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─────────────────────────────────────────────────────────────
-- 4) profiles: Campos faltantes usados pelo engine/auth
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level_pending_approval BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 5) levels: Campos de requisitos extras (PRD §3.1)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE levels ADD COLUMN IF NOT EXISTS min_missions_completed INTEGER DEFAULT 0;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS min_referrals_active INTEGER DEFAULT 0;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 6) point_transactions: Tabela do ledger (se não existir)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'credit',
    source_type TEXT,
    source_id UUID,
    description TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_idempotency ON point_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 7) invitations: Tabela se não existir (usada pelo invitations module)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES profiles(id),
    invitee_email TEXT,
    invitee_phone TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'validated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    registered_at TIMESTAMPTZ,
    validated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);

-- ─────────────────────────────────────────────────────────────
-- 8) consents: Tabela se não existir
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    granted BOOLEAN DEFAULT true,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- ─────────────────────────────────────────────────────────────
-- 9) audit_logs: Para o módulo admin (se não existir)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 10) Índices de leitura quente
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_user_missions_user_status ON user_missions(user_id, status);
CREATE INDEX IF NOT EXISTS ix_missions_active_featured ON missions(is_active, is_featured);

-- ─────────────────────────────────────────────────────────────
-- 11) Eventos: campos faltantes para check-in
-- ─────────────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_code TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_start TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_end TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS checkin_radius_meters INTEGER DEFAULT 500;
ALTER TABLE events ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0;

COMMIT;
