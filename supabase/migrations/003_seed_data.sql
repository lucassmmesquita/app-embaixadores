-- ═══════════════════════════════════════════════════════════════
-- Seed Data — Initial levels, categories, badges, and sample data
-- ═══════════════════════════════════════════════════════════════

-- ═══ LEVELS ═══
INSERT INTO levels (name, slug, description, order_index, min_points, max_points, color) VALUES
    ('Apoiador', 'apoiador', 'Bem-vindo à rede! Comece participando das atividades básicas da campanha.', 1, 0, 99, '#60A5FA'),
    ('Embaixador', 'embaixador', 'Você já mostrou comprometimento. Novas missões e conteúdos exclusivos estão disponíveis.', 2, 100, 499, '#34D399'),
    ('Mobilizador', 'mobilizador', 'Você é um agente de mudança. Organize encontros e amplie a rede.', 3, 500, 1499, '#FBBF24'),
    ('Líder Comunitário', 'lider-comunitario', 'Sua dedicação é inspiradora. Coordene ações em sua região.', 4, 1500, 4999, '#F97316'),
    ('Coordenador de Rede', 'coordenador-de-rede', 'O mais alto nível de reconhecimento. Você é parte estratégica da campanha.', 5, 5000, NULL, '#EF4444');

-- ═══ MISSION CATEGORIES ═══
INSERT INTO mission_categories (name, slug, icon, color, order_index) VALUES
    ('Engajamento Digital', 'engajamento-digital', '📱', '#3B82F6', 1),
    ('Presencial', 'presencial', '🤝', '#10B981', 2),
    ('Formação', 'formacao', '📚', '#8B5CF6', 3),
    ('Mobilização', 'mobilizacao', '📣', '#F59E0B', 4),
    ('Comunidade', 'comunidade', '🏘️', '#EF4444', 5),
    ('Especial', 'especial', '⭐', '#EC4899', 6);

-- ═══ SAMPLE MISSIONS ═══
INSERT INTO missions (title, description, category_id, mission_type, action_type, points_reward, required_count, is_featured) VALUES
    (
        'Compartilhe nas redes sociais',
        'Compartilhe um conteúdo oficial da campanha nas suas redes sociais (WhatsApp, Instagram, Facebook ou Twitter).',
        (SELECT id FROM mission_categories WHERE slug = 'engajamento-digital'),
        'recurring', 'share_content', 10, 1, true
    ),
    (
        'Convide um amigo',
        'Convide um amigo para participar da Rede de Embaixadores usando seu código de indicação.',
        (SELECT id FROM mission_categories WHERE slug = 'mobilizacao'),
        'recurring', 'invite_user', 25, 1, true
    ),
    (
        'Participe de um evento',
        'Confirme presença e faça check-in em um evento da campanha.',
        (SELECT id FROM mission_categories WHERE slug = 'presencial'),
        'recurring', 'attend_event', 30, 1, true
    ),
    (
        'Complete seu perfil',
        'Preencha todos os campos do seu perfil para que possamos conhecer você melhor.',
        (SELECT id FROM mission_categories WHERE slug = 'engajamento-digital'),
        'one_time', 'complete_profile', 15, 1, false
    ),
    (
        'Participe de um treinamento',
        'Assista a um treinamento online ou presencial sobre as propostas da campanha.',
        (SELECT id FROM mission_categories WHERE slug = 'formacao'),
        'recurring', 'attend_training', 40, 1, false
    ),
    (
        'Organize um encontro comunitário',
        'Organize um encontro na sua comunidade para discutir as propostas da campanha. Envie fotos como comprovação.',
        (SELECT id FROM mission_categories WHERE slug = 'comunidade'),
        'one_time', 'organize_meeting', 100, 1, true
    ),
    (
        'Colete demandas da população',
        'Converse com pessoas da sua comunidade e registre suas demandas e sugestões.',
        (SELECT id FROM mission_categories WHERE slug = 'comunidade'),
        'recurring', 'collect_demands', 20, 5, false
    ),
    (
        'Divulgue uma proposta',
        'Escolha uma proposta da campanha e divulgue para pelo menos 10 pessoas.',
        (SELECT id FROM mission_categories WHERE slug = 'mobilizacao'),
        'recurring', 'spread_proposal', 15, 1, false
    );

-- ═══ BADGES ═══
INSERT INTO badges (name, description, icon_url, category, rarity, criteria_type, criteria_value) VALUES
    ('Primeiro Passo', 'Completou sua primeira missão', NULL, 'milestone', 'common', 'missions_completed', 1),
    ('Engajado', 'Completou 5 missões', NULL, 'achievement', 'common', 'missions_completed', 5),
    ('Dedicado', 'Completou 15 missões', NULL, 'achievement', 'uncommon', 'missions_completed', 15),
    ('Incansável', 'Completou 50 missões', NULL, 'achievement', 'rare', 'missions_completed', 50),
    ('Lenda', 'Completou 100 missões', NULL, 'achievement', 'legendary', 'missions_completed', 100),
    ('Pontuação 100', 'Alcançou 100 pontos', NULL, 'milestone', 'common', 'points_threshold', 100),
    ('Pontuação 500', 'Alcançou 500 pontos', NULL, 'milestone', 'uncommon', 'points_threshold', 500),
    ('Pontuação 1500', 'Alcançou 1500 pontos', NULL, 'milestone', 'rare', 'points_threshold', 1500),
    ('Pontuação 5000', 'Alcançou 5000 pontos', NULL, 'milestone', 'epic', 'points_threshold', 5000),
    ('Participante Ativo', 'Participou de 3 eventos', NULL, 'event', 'common', 'events_attended', 3),
    ('Frequentador', 'Participou de 10 eventos', NULL, 'event', 'uncommon', 'events_attended', 10),
    ('Presença Garantida', 'Participou de 25 eventos', NULL, 'event', 'rare', 'events_attended', 25),
    ('Multiplicador', 'Indicou 3 novos embaixadores', NULL, 'achievement', 'common', 'referrals', 3),
    ('Recrutador', 'Indicou 10 novos embaixadores', NULL, 'achievement', 'uncommon', 'referrals', 10),
    ('Formador de Rede', 'Indicou 25 novos embaixadores', NULL, 'achievement', 'rare', 'referrals', 25),
    ('Super Recrutador', 'Indicou 50 novos embaixadores', NULL, 'achievement', 'epic', 'referrals', 50);

-- ═══ SAMPLE REGIONS ═══
INSERT INTO regions (name, slug, city, state) VALUES
    ('Centro', 'centro', 'São Paulo', 'SP'),
    ('Zona Norte', 'zona-norte', 'São Paulo', 'SP'),
    ('Zona Sul', 'zona-sul', 'São Paulo', 'SP'),
    ('Zona Leste', 'zona-leste', 'São Paulo', 'SP'),
    ('Zona Oeste', 'zona-oeste', 'São Paulo', 'SP'),
    ('Grande ABC', 'grande-abc', 'Santo André', 'SP'),
    ('Guarulhos', 'guarulhos', 'Guarulhos', 'SP'),
    ('Osasco', 'osasco', 'Osasco', 'SP');
