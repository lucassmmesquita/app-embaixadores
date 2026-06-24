/**
 * ═══════════════════════════════════════════════════════════════
 *  Share Messages — Textos de compartilhamento por tipo
 *  Centralizados para manter consistência entre telas
 * ═══════════════════════════════════════════════════════════════
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Monta o link de convite do usuário logado
 */
export function getInviteLink(referralCode: string): string {
  return `${API_BASE_URL}/convite/${referralCode}`;
}

/**
 * Monta o link do material com referral
 */
export function getMaterialLink(contentId: string, referralCode: string): string {
  return `${API_BASE_URL}/material/${contentId}${referralCode ? `?ref=${referralCode}` : ''}`;
}

/**
 * Monta o link do evento com referral
 */
export function getEventLink(eventId: string, referralCode: string): string {
  return `${API_BASE_URL}/evento/${eventId}${referralCode ? `?ref=${referralCode}` : ''}`;
}

// ═══ MATERIAIS ═══

export function getContentShareMessage(
  contentType: string,
  materialLink: string,
  inviteLink: string,
): string {
  switch (contentType) {
    case 'image':
      return [
        '📷 Espalhe essa ideia!',
        '',
        'Acabamos de soltar uma arte nova e o seu compartilhamento faz toda a diferença.',
        '',
        'Como ajudar:',
        '1. Acesse o conteúdo pelo link abaixo',
        '2. Compartilhe nas suas redes e grupos',
        '3. Marque a campanha pra gente ver seu alcance!',
        '',
        'Cada compartilhamento conta pontos na sua jornada de Embaixador. 🚀',
        '',
        `🔗 ${materialLink}`,
        '',
        'Ainda não está na Rede? Entre agora, é só clicar no link:',
        inviteLink,
      ].join('\n');

    case 'video':
      return [
        '🎥 Esse vídeo precisa chegar em todo mundo!',
        '',
        'Conteúdo novo no ar — e a melhor forma de fazer a mensagem viralizar é com você.',
        '',
        'Como ajudar:',
        '1. Assista pelo link abaixo',
        '2. Compartilhe nos grupos de WhatsApp e nas redes',
        '3. Confirme o compartilhamento pra somar pontos!',
        '',
        'Quanto mais gente alcançada, mais perto da próxima conquista. 🚀',
        '',
        `🔗 ${materialLink}`,
        '',
        'Ainda não faz parte? Entre agora, é só clicar no link:',
        inviteLink,
      ].join('\n');

    case 'post':
    default:
      return [
        '✍️ Mensagem nova pra compartilhar!',
        '',
        'Preparamos um post oficial pronto pra você espalhar. É só copiar e colar.',
        '',
        'Como ajudar:',
        '1. Acesse o conteúdo pelo link abaixo',
        '2. Copie o texto e a arte',
        '3. Publique nas suas redes e marque a campanha!',
        '',
        'Compartilhou? Confirme no app e some pontos na sua jornada. 🚀',
        '',
        `🔗 ${materialLink}`,
        '',
        'Ainda não está na Rede de Embaixadores? Entre agora, é só clicar no link:',
        inviteLink,
      ].join('\n');
  }
}

// ═══ EVENTOS ═══

export function getEventShareMessage(
  isOnline: boolean,
  dateStr: string,
  timeStr: string,
  location: string,
  eventLink: string,
  inviteLink: string,
  onlineUrl?: string,
): string {
  if (isOnline) {
    return [
      '💻 Participe do nosso encontro online!',
      'Conversa, formação e mobilização — sem sair de casa.',
      '',
      `📅 ${dateStr} às ${timeStr}`,
      '',
      '🔗 Acesso pelo link abaixo',
      '',
      'Como participar:',
      '1. Confirme presença pelo link abaixo',
      '2. Entre na transmissão no horário marcado',
      '3. Faça o check-in pra somar pontos na sua jornada!',
      '',
      'Participar das formações é um passo importante pra evoluir de nível. 🚀',
      '',
      `🔗 ${eventLink}`,
      '',
      'Ainda não está na Rede? Entre agora, é só clicar no link:',
      inviteLink,
    ].join('\n');
  }

  return [
    '📍 Vem pro nosso encontro!',
    '',
    'A campanha vai estar perto de você e a sua presença faz a diferença.',
    '',
    `📅 ${dateStr} às ${timeStr}`,
    `📌 ${location}`,
    '',
    'Como participar:',
    '1. Confirme presença pelo link abaixo',
    '2. Compareça no dia e horário',
    '3. Faça o check-in no local pra garantir seus pontos!',
    '',
    'Encontrar gente que acredita no mesmo projeto fortalece a nossa rede. 🚀',
    '',
    `🔗 ${eventLink}`,
    '',
    'Ainda não faz parte? Entre agora, é só clicar no link:',
    inviteLink,
  ].join('\n');
}
