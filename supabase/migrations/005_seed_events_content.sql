-- ═══════════════════════════════════════════════════════════════
-- Seed Data: Eventos, Conteúdos e Dados de Demonstração
-- Fase 4: Dados diretos no banco (sem portal admin)
-- ═══════════════════════════════════════════════════════════════

-- ═══ SAMPLE EVENTS ═══
-- Eventos futuros para demonstração no app
INSERT INTO events (
  title, description, event_type, location_name, address, city,
  latitude, longitude, start_datetime, end_datetime,
  max_capacity, points_reward, is_featured, is_active,
  checkin_code, checkin_start, checkin_end
) VALUES
  (
    'Encontro Regional — Zona Norte',
    'Venha conhecer as propostas da campanha e conectar-se com outros embaixadores da Zona Norte. Teremos dinâmicas de grupo, apresentação de resultados e planejamento de ações.',
    'meeting', 'Centro Cultural da Juventude', 'Av. Deputado Emílio Carlos, 3641', 'São Paulo',
    -23.4856, -46.6756,
    NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '3 hours',
    80, 30, true, true,
    'ZN2026', NOW() + INTERVAL '3 days' - INTERVAL '30 minutes', NOW() + INTERVAL '3 days' + INTERVAL '2 hours'
  ),
  (
    'Live: Propostas para a Educação',
    'Transmissão ao vivo discutindo as propostas educacionais da campanha. Participe pelo link e ganhe pontos!',
    'online', NULL, NULL, NULL,
    NULL, NULL,
    NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours',
    NULL, 15, false, true,
    'EDU2026', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours'
  ),
  (
    'Treinamento de Lideranças',
    'Capacitação presencial para embaixadores nível Mobilizador ou superior. Temas: comunicação, organização comunitária e gestão de equipes.',
    'training', 'Hotel Intercity Paulista', 'R. Haddock Lobo, 294 — Cerqueira César', 'São Paulo',
    -23.5567, -46.6654,
    NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '8 hours',
    40, 50, true, true,
    'LID2026', NOW() + INTERVAL '7 days' - INTERVAL '15 minutes', NOW() + INTERVAL '7 days' + INTERVAL '1 hour'
  ),
  (
    'Ação Comunitária — Zona Leste',
    'Mutirão de divulgação no bairro. Distribuição de materiais e conversa com moradores sobre as propostas da campanha.',
    'community', 'Praça Padre Cícero', 'R. Dr. Luiz Ayres, 20 — Itaquera', 'São Paulo',
    -23.5396, -46.4533,
    NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '4 hours',
    100, 40, false, true,
    'ZL2026', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours'
  ),
  (
    'Grande Comício — Centro',
    'Evento principal da campanha no centro de São Paulo. Música, palestrantes e anúncios importantes.',
    'rally', 'Praça da Sé', 'Praça da Sé, s/n — Sé', 'São Paulo',
    -23.5505, -46.6340,
    NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '5 hours',
    5000, 60, true, true,
    'COMICIO26', NOW() + INTERVAL '14 days' - INTERVAL '1 hour', NOW() + INTERVAL '14 days' + INTERVAL '4 hours'
  ),
  (
    'Workshop: Redes Sociais para Campanha',
    'Aprenda técnicas de comunicação digital para amplificar o alcance da campanha. Traga seu celular!',
    'training', 'Espaço Coletivo', 'R. Augusta, 1500 — Consolação', 'São Paulo',
    -23.5550, -46.6585,
    NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '3 hours',
    30, 35, false, true,
    'SOCIAL26', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '2 hours'
  ),
  (
    'Café com Embaixadores — ABC',
    'Encontro informal para trocar experiências e planejar ações regionais no Grande ABC.',
    'meeting', 'Cafeteria Arábica', 'R. das Figueiras, 500 — Santo André', 'Santo André',
    -23.6638, -46.5316,
    NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '2 hours',
    25, 20, false, true,
    'ABC2026', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '1 hour 30 minutes'
  );

-- ═══ SAMPLE CONTENT ═══
-- Materiais prontos para compartilhamento
INSERT INTO content (
  title, description, content_type, file_url, thumbnail_url,
  share_text, points_per_share, is_active, is_featured
) VALUES
  (
    '10 Propostas para Transformar São Paulo',
    'Conheça as 10 principais propostas da campanha para educação, saúde, transporte e segurança.',
    'link',
    'https://embaixadores.app/propostas',
    NULL,
    'Conheça as 10 propostas que vão transformar São Paulo! 🏙️ #RedeEmbaixadores',
    10, true, true
  ),
  (
    'Vídeo: Nossa Visão para a Educação',
    'Vídeo de 3 minutos explicando as propostas educacionais da campanha.',
    'video',
    'https://youtube.com/watch?v=example1',
    NULL,
    '📺 Assista e compartilhe nossa visão para a educação! #Educação #Campanha',
    10, true, true
  ),
  (
    'Infográfico: Saúde para Todos',
    'Dados e propostas para melhorar o sistema de saúde pública.',
    'infographic',
    'https://embaixadores.app/infografico-saude',
    NULL,
    '🏥 Saúde para todos: conheça nossas propostas! #SaúdePública',
    10, true, false
  ),
  (
    'Card para WhatsApp: Transporte',
    'Imagem otimizada para compartilhar no WhatsApp sobre propostas de transporte.',
    'post',
    'https://embaixadores.app/cards/transporte.png',
    NULL,
    '🚌 Transporte de qualidade é direito de todos! Compartilhe! #Transporte',
    5, true, false
  ),
  (
    'Cartilha do Embaixador',
    'Guia completo de como ser um embaixador eficiente. Dicas de abordagem, FAQ e argumentação.',
    'document',
    'https://embaixadores.app/cartilha.pdf',
    NULL,
    '📖 Cartilha do Embaixador — tudo que você precisa saber!',
    15, true, true
  ),
  (
    'Depoimento: Maria, professora em Guarulhos',
    'Vídeo com depoimento de uma professora sobre os impactos das propostas na educação.',
    'video',
    'https://youtube.com/watch?v=example2',
    NULL,
    '💬 Ouça o depoimento da professora Maria sobre nossas propostas! #Educação',
    10, true, false
  ),
  (
    'Card para Instagram: Segurança',
    'Post pronto para compartilhar no Instagram sobre propostas de segurança pública.',
    'post',
    'https://embaixadores.app/cards/seguranca.png',
    NULL,
    '🛡️ Segurança para sua família! Conheça nossas propostas. #SegurançaPública',
    5, true, false
  ),
  (
    'FAQ: Perguntas frequentes sobre a campanha',
    'Documento com respostas para as perguntas mais comuns sobre propostas e participação.',
    'document',
    'https://embaixadores.app/faq',
    NULL,
    '❓ Tire suas dúvidas sobre a campanha! #FAQ #RedeEmbaixadores',
    10, true, false
  ),
  (
    'Vídeo: Como usar o App Rede de Embaixadores',
    'Tutorial em vídeo mostrando como usar todas as funcionalidades do aplicativo.',
    'video',
    'https://youtube.com/watch?v=example3',
    NULL,
    '📱 Aprenda a usar o App Rede de Embaixadores! #Tutorial',
    10, true, true
  ),
  (
    'Imagens para Redes Sociais — Pack Completo',
    'Pack com 12 imagens otimizadas para diferentes redes sociais.',
    'image',
    'https://embaixadores.app/pack-imagens',
    NULL,
    '🖼️ Pack completo de imagens para suas redes sociais! #Campanha',
    15, true, false
  );

