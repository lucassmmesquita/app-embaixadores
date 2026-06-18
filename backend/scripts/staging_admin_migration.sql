-- ═══════════════════════════════════════════════════════════════
--  Rede de Embaixadores — Staging Migration: Admin Panel
--  Rodar no DBeaver conectado ao banco de staging (Supabase)
--  Data: 2026-06-17
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
--  PARTE 1: TABELAS (Migration a1b2c3d4e5f6)
-- ═══════════════════════════════════════════════════════════════

-- 1.1 Tabela admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    full_name VARCHAR(300) NOT NULL,
    role VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    refresh_token_hash VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_admin_users_email ON admin_users (email);

-- 1.2 Tabela admin_permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_admin_permission UNIQUE (admin_user_id, resource, action)
);

CREATE INDEX IF NOT EXISTS ix_admin_permissions_admin_user_id ON admin_permissions (admin_user_id);

-- 1.3 Registrar migration no alembic_version
-- (Se a tabela alembic_version existir, atualiza; senão ignora)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version') THEN
        DELETE FROM alembic_version WHERE version_num = 'c2a3f4e5d6b7';
        INSERT INTO alembic_version (version_num) VALUES ('a1b2c3d4e5f6');
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
--  PARTE 2: SEED — Super Admin
--  Email: admin@rede.com | Senha: SenhaAdmin123
-- ═══════════════════════════════════════════════════════════════

INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@rede.com',
    'pbkdf2:sha256:260000$a69b4cd1bc5be51e15800d243dc7d113$0c9510feb75008a0f152a15567fd974d7919de1c73c45f0f1a6549f5cfed4508',
    'Administrador',
    'super_admin',
    true,
    now(),
    now()
)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
--  PARTE 3: DADOS DE TESTE (Eventos, Conteúdo, Auditoria)
-- ═══════════════════════════════════════════════════════════════

-- 3.1 Eventos
INSERT INTO events (id, title, description, event_type, location_name, city, start_datetime, end_datetime, points_reward, checkin_code, is_featured, metadata, created_at, updated_at) VALUES
(gen_random_uuid(), 'Encontro Regional Norte', 'Reunião dos embaixadores da região Norte para alinhamento de estratégias e troca de experiências.', 'meeting', 'Centro de Convenções Manaus', 'Manaus', '2026-07-05 09:00:00-03', '2026-07-05 12:00:00-03', 50, 'NORTE2026', true, '{}', now(), now()),
(gen_random_uuid(), 'Workshop de Engajamento Digital', 'Capacitação sobre técnicas de engajamento em redes sociais e produção de conteúdo.', 'workshop', 'Hub de Inovação SP', 'São Paulo', '2026-07-12 14:00:00-03', '2026-07-12 18:00:00-03', 75, 'DIGITAL26', false, '{}', now(), now()),
(gen_random_uuid(), 'Live: Resultados do 1º Semestre', 'Apresentação dos resultados da rede no primeiro semestre de 2026.', 'online', NULL, NULL, '2026-07-20 19:00:00-03', '2026-07-20 20:30:00-03', 30, 'LIVE0720', false, '{}', now(), now()),
(gen_random_uuid(), 'Mutirão Comunidade Solidária', 'Ação social com embaixadores em comunidades carentes. Distribuição de kits e cadastro.', 'action', 'Praça Central', 'Recife', '2026-08-02 08:00:00-03', '2026-08-02 13:00:00-03', 100, 'MUTIRAO8', true, '{}', now(), now()),
(gen_random_uuid(), 'Formação de Novos Líderes', 'Treinamento intensivo para embaixadores que desejam se tornar coordenadores regionais.', 'training', 'Sede Nacional', 'Brasília', '2026-08-15 09:00:00-03', '2026-08-16 17:00:00-03', 150, 'LIDER826', true, '{}', now(), now())
ON CONFLICT DO NOTHING;

-- 3.2 Conteúdo (precisa de um profile_id existente; usa subquery)
DO $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id FROM profiles WHERE is_active = true LIMIT 1;
    
    IF v_profile_id IS NOT NULL THEN
        INSERT INTO content (id, title, description, content_type, category, share_text, points_per_share, is_featured, total_shares, created_by, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Guia do Embaixador 2026', 'Manual completo com orientações para novos embaixadores da rede.', 'document', 'Formação', 'Conheça o Guia do Embaixador 2026! #RedeEmbaixadores', 10, true, 45, v_profile_id, now() - interval '10 days', now()),
        (gen_random_uuid(), 'Vídeo: Como Engajar sua Comunidade', 'Dicas práticas de engajamento comunitário com cases de sucesso.', 'video', 'Engajamento', 'Assista ao vídeo sobre engajamento comunitário!', 15, true, 128, v_profile_id, now() - interval '7 days', now()),
        (gen_random_uuid(), 'Infográfico: Metas do 2º Semestre', 'Resumo visual das metas e objetivos para o segundo semestre.', 'image', 'Comunicação', 'Compartilhe as metas do 2º semestre! #Metas2026', 10, false, 67, v_profile_id, now() - interval '5 days', now()),
        (gen_random_uuid(), 'Podcast: Histórias de Impacto', 'Entrevistas com embaixadores que transformaram suas comunidades.', 'audio', 'Inspiração', 'Ouça as histórias de impacto dos nossos embaixadores!', 20, false, 32, v_profile_id, now() - interval '3 days', now()),
        (gen_random_uuid(), 'Card: Convite para Eventos de Julho', 'Material para divulgação dos eventos do mês de julho.', 'image', 'Divulgação', 'Participe dos eventos de julho! Inscreva-se já.', 5, true, 210, v_profile_id, now() - interval '1 day', now())
        ON CONFLICT DO NOTHING;

        -- 3.3 Audit Logs
        INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES
        (gen_random_uuid(), v_profile_id, 'create_mission', 'mission', gen_random_uuid()::text, '{"title": "Convidar 5 amigos"}', '192.168.1.10', now() - interval '5 days'),
        (gen_random_uuid(), v_profile_id, 'update_role', 'user', gen_random_uuid()::text, '{"old_role": "participant", "new_role": "regional_coordinator"}', '192.168.1.10', now() - interval '4 days'),
        (gen_random_uuid(), v_profile_id, 'approve_level', 'user', gen_random_uuid()::text, '{"level": "Embaixador", "approved": true}', '192.168.1.10', now() - interval '3 days'),
        (gen_random_uuid(), v_profile_id, 'create_event', 'event', gen_random_uuid()::text, '{"title": "Encontro Regional Norte"}', '10.0.0.5', now() - interval '2 days'),
        (gen_random_uuid(), v_profile_id, 'create_content', 'content', gen_random_uuid()::text, '{"title": "Guia do Embaixador 2026"}', '10.0.0.5', now() - interval '1 day'),
        (gen_random_uuid(), v_profile_id, 'suspend_user', 'user', gen_random_uuid()::text, '{"reason": "Violação dos termos de uso"}', '10.0.0.5', now() - interval '12 hours'),
        (gen_random_uuid(), v_profile_id, 'send_campaign', 'notification', gen_random_uuid()::text, '{"title": "Lembrete: Evento amanhã", "recipients": 342}', '192.168.1.10', now() - interval '6 hours'),
        (gen_random_uuid(), v_profile_id, 'update_mission', 'mission', gen_random_uuid()::text, '{"points_reward": 50, "is_active": true}', '192.168.1.10', now() - interval '2 hours')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════
--  FIM — Verificação
-- ═══════════════════════════════════════════════════════════════

-- Rodar estas queries para verificar:
-- SELECT count(*) FROM admin_users;          -- Esperado: 1
-- SELECT count(*) FROM admin_permissions;    -- Esperado: 0
-- SELECT count(*) FROM events;              -- Esperado: 5+
-- SELECT count(*) FROM content;             -- Esperado: 5+
-- SELECT count(*) FROM audit_logs;          -- Esperado: 8+
