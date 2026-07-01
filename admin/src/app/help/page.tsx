"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users, Calendar, FileText, Bell,
  Target, Award, Trophy, Coins, Shield, ScrollText, Settings,
  LayoutDashboard,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Data — Sections & Subsections
   Each section has an id, icon, title, and subsections.
   Each subsection has an id, title, and HTML content.
   ═══════════════════════════════════════════════════════════ */

interface Subsection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface DocSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  intro: React.ReactNode;
  subsections: Subsection[];
}

const DOCS: DocSection[] = [
  {
    id: "dashboard",
    icon: <LayoutDashboard size={18} />,
    title: "Dashboard",
    intro: <p>O Dashboard é a tela inicial do painel administrativo. Ele apresenta uma visão geral com os indicadores mais importantes da plataforma.</p>,
    subsections: [
      {
        id: "dashboard-indicadores",
        title: "Indicadores",
        content: (
          <>
            <p>Os cards no topo mostram os totais em tempo real:</p>
            <ul>
              <li><strong>Total de Embaixadores</strong> — Quantidade de usuários registrados na plataforma.</li>
              <li><strong>Eventos Ativos</strong> — Eventos que estão acontecendo ou programados.</li>
              <li><strong>Materiais</strong> — Total de conteúdos publicados.</li>
              <li><strong>Missões Ativas</strong> — Missões disponíveis para participação.</li>
            </ul>
          </>
        ),
      },
      {
        id: "dashboard-exportar",
        title: "Exportar para Excel",
        content: (
          <>
            <p>Use o botão <strong>Exportar Excel</strong> no Dashboard para baixar uma planilha com os dados da plataforma. O arquivo gerado inclui informações consolidadas para análise externa.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "users",
    icon: <Users size={18} />,
    title: "Usuários",
    intro: <p>Visualize todos os embaixadores cadastrados na plataforma, seus dados, pontos, níveis e atividades.</p>,
    subsections: [
      {
        id: "users-listagem",
        title: "Listagem e busca",
        content: (
          <>
            <p>A tabela exibe todos os embaixadores com as seguintes colunas: Nome, Email, Pontos, Nível, Status e Cadastro.</p>
            <ul>
              <li>Use o <strong>campo de busca</strong> no topo da tabela para filtrar por nome ou e-mail.</li>
              <li>Use os <strong>filtros de Nível e Status</strong> para refinar a listagem.</li>
              <li>Clique no <strong>cabeçalho de uma coluna</strong> para ordenar os resultados.</li>
              <li>A paginação no rodapé permite navegar entre as páginas.</li>
            </ul>
          </>
        ),
      },
      {
        id: "users-status",
        title: "Status do usuário",
        content: (
          <>
            <p>A coluna <strong>Status</strong> exibe um indicador visual com a situação do embaixador:</p>
            <ul>
              <li><strong>Ativo</strong> — O embaixador pode acessar o app normalmente.</li>
              <li><strong>Suspenso</strong> — O embaixador não consegue fazer login. Seus dados são preservados.</li>
            </ul>
            <p>Use o filtro de <strong>Status</strong> no topo da tabela para listar apenas usuários ativos ou suspensos.</p>
          </>
        ),
      },
      {
        id: "users-perfil",
        title: "Perfil do usuário",
        content: (
          <>
            <p>Clique no nome de um usuário para ver seu perfil completo. O painel de detalhes mostra:</p>
            <ul>
              <li><strong>Resumo</strong> — Pontos, Missões, Eventos e Indicações em cards no topo.</li>
              <li><strong>Dados Pessoais</strong> — Nome, e-mail, telefone, nível e data de cadastro.</li>
              <li><strong>Missões</strong> — Lista de missões com status (Em Progresso, Submetida, Concluída, Rejeitada).</li>
              <li><strong>Atividades</strong> — Histórico de ações do embaixador.</li>
              <li><strong>Conquistas</strong> — Conquistas desbloqueadas pelo embaixador.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "events",
    icon: <Calendar size={18} />,
    title: "Eventos",
    intro: <p>Crie e gerencie eventos presenciais e online. Os embaixadores podem se inscrever e fazer check-in pelo app.</p>,
    subsections: [
      {
        id: "events-criar",
        title: "Criar um evento",
        content: (
          <>
            <ol>
              <li>Clique no botão <strong>+ Novo Evento</strong> no canto superior direito.</li>
              <li>Preencha os campos obrigatórios (marcados com *).</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "events-campos",
        title: "Campos do formulário",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Campo</th><th>Descrição</th><th>Obrigatório</th></tr></thead>
              <tbody>
                <tr><td>Título</td><td>Nome do evento exibido no app</td><td>Sim</td></tr>
                <tr><td>Descrição</td><td>Detalhes e informações sobre o evento</td><td>Não</td></tr>
                <tr><td>Início</td><td>Data e hora em que o evento começa</td><td>Sim</td></tr>
                <tr><td>Fim</td><td>Data e hora em que o evento termina</td><td>Não</td></tr>
                <tr><td>Capacidade</td><td>Limite de participantes (vazio = ilimitado)</td><td>Não</td></tr>
                <tr><td>Pontos</td><td>Pontos ganhos ao participar</td><td>Não</td></tr>
                <tr><td>Tipo</td><td>Reunião, Comício, Treinamento, Comunitário, Online ou Exclusivo</td><td>Sim</td></tr>
                <tr><td>Imagem de capa</td><td>Upload de imagem ou link externo</td><td>Não</td></tr>
                <tr><td>Nome do Local</td><td>Nome do local do evento (para presenciais)</td><td>Não</td></tr>
                <tr><td>Endereço</td><td>Endereço completo</td><td>Não</td></tr>
                <tr><td>Cidade</td><td>Cidade do evento</td><td>Não</td></tr>
                <tr><td>Raio de check-in</td><td>Raio em metros para check-in por geolocalização</td><td>Não</td></tr>
                <tr><td>Mapa</td><td>Clique no mapa para marcar a localização exata ou use "Localizar no mapa"</td><td>Não</td></tr>
                <tr><td>Link do evento</td><td>URL de acesso ao evento online (para tipo Online)</td><td>Não</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "events-tipo",
        title: "Tipos de evento",
        content: (
          <>
            <p>O tipo do evento define a categoria e quais campos são exibidos:</p>
            <ul>
              <li><strong>Reunião, Comício, Treinamento, Comunitário, Exclusivo</strong> — Eventos presenciais. Exibem campos de local, endereço, cidade, mapa e raio de check-in.</li>
              <li><strong>Online</strong> — Exibe campo de link do evento. O embaixador acessa o link para participar.</li>
            </ul>
            <p>Os campos de localização (nome do local, endereço, cidade e mapa) aparecem apenas quando o tipo NÃO é Online.</p>
          </>
        ),
      },
      {
        id: "events-checkin",
        title: "Check-in",
        content: (
          <>
            <p>O check-in valida a presença do embaixador no evento.</p>
            <ul>
              <li><strong>QR Code</strong> — O organizador gera um QR Code e o embaixador escaneia pelo app.</li>
              <li><strong>Geolocalização</strong> — O app verifica se o embaixador está próximo ao local do evento.</li>
              <li><strong>Manual</strong> — O check-in é feito pelo organizador diretamente no painel.</li>
            </ul>
          </>
        ),
      },
      {
        id: "events-editar",
        title: "Editar e desativar",
        content: (
          <>
            <p>Clique em um evento na tabela para abrir o formulário de edição. Altere os campos desejados e clique em <strong>Salvar</strong>.</p>
            <p>Para desativar um evento, use o <strong>toggle na coluna Status</strong> da tabela. Eventos desativados não aparecem no app.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "content",
    icon: <FileText size={18} />,
    title: "Material",
    intro: <p>Publique conteúdos para os embaixadores visualizarem e compartilharem nas redes sociais, acumulando pontos.</p>,
    subsections: [
      {
        id: "content-tipos",
        title: "Tipos de conteúdo",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Tipo</th><th>Descrição</th><th>Arquivo</th></tr></thead>
              <tbody>
                <tr><td><strong>Post</strong></td><td>Artigos, notícias ou links externos</td><td>Apenas link (URL)</td></tr>
                <tr><td><strong>Imagem</strong></td><td>Fotos e artes visuais</td><td>Upload (JPG, PNG, WebP, GIF) ou link</td></tr>
                <tr><td><strong>Vídeo</strong></td><td>Vídeos informativos ou promocionais</td><td>Upload (MP4, WebM, MOV) ou link</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "content-criar",
        title: "Criar material",
        content: (
          <>
            <ol>
              <li>Clique em <strong>+ Novo Material</strong>.</li>
              <li>Preencha o título e escolha o tipo de conteúdo.</li>
              <li>Adicione o arquivo ou link conforme o tipo.</li>
              <li>Adicione uma imagem de capa (recomendado).</li>
              <li>Defina os pontos por compartilhamento.</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "content-campos",
        title: "Campos do formulário",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Campo</th><th>Descrição</th><th>Obrigatório</th></tr></thead>
              <tbody>
                <tr><td>Título</td><td>Nome do material exibido no app</td><td>Sim</td></tr>
                <tr><td>Descrição</td><td>Detalhes sobre o conteúdo</td><td>Não</td></tr>
                <tr><td>Tipo</td><td>Post, Imagem ou Vídeo</td><td>Sim</td></tr>
                <tr><td>Arquivo / Link</td><td>O conteúdo principal. Para Post: campo de URL. Para Imagem/Vídeo: botões Upload ou Link</td><td>Sim</td></tr>
                <tr><td>Imagem de capa</td><td>Thumbnail exibida na listagem. Upload ou link</td><td>Não (recomendado)</td></tr>
                <tr><td>Pontos por compartilhamento</td><td>Pontos que o embaixador ganha ao compartilhar</td><td>Sim</td></tr>
                <tr><td>Destaque</td><td>Material aparece em destaque no app</td><td>Não</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "content-upload",
        title: "Upload de arquivos",
        content: (
          <>
            <p>Para campos de <strong>Imagem</strong> e <strong>Vídeo</strong>, use os botões no topo do campo:</p>
            <ul>
              <li><strong>Upload</strong> — Envie um arquivo do seu computador. Aceita arrastar e soltar (drag &amp; drop).</li>
              <li><strong>Link</strong> — Informe uma URL externa onde o arquivo está hospedado.</li>
            </ul>
            <p><strong>Limites de tamanho:</strong></p>
            <ul>
              <li>Imagens: até <strong>10 MB</strong></li>
              <li>Vídeos: até <strong>50 MB</strong></li>
            </ul>
            <p>Após o upload, o nome original do arquivo é exibido. Ao editar um material existente, o nome do arquivo é preservado.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "notifications",
    icon: <Bell size={18} />,
    title: "Notificações",
    intro: <p>Envie notificações push e in-app para os embaixadores. Notifique sobre novos eventos, conteúdos ou comunicados.</p>,
    subsections: [
      {
        id: "notifications-enviar",
        title: "Enviar notificação",
        content: (
          <>
            <ol>
              <li>Clique em <strong>+ Nova Notificação</strong>.</li>
              <li>Preencha o título e a mensagem.</li>
              <li>Escolha o público-alvo.</li>
              <li>Clique em <strong>Enviar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "notifications-campos",
        title: "Campos do formulário",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Campo</th><th>Descrição</th><th>Obrigatório</th></tr></thead>
              <tbody>
                <tr><td>Título</td><td>Título da notificação (aparece em negrito no app)</td><td>Sim</td></tr>
                <tr><td>Mensagem</td><td>Corpo da notificação com os detalhes</td><td>Sim</td></tr>
                <tr><td>Público-alvo</td><td>Todos os usuários, por nível ou por região</td><td>Sim</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "notifications-tipos",
        title: "Tipos de entrega",
        content: (
          <>
            <ul>
              <li><strong>Push</strong> — Aparece no celular mesmo com o app fechado. Requer que o embaixador tenha permitido notificações no dispositivo.</li>
              <li><strong>In-App</strong> — Aparece na central de notificações dentro do app, acessível pelo ícone de sino.</li>
            </ul>
            <p>Ambos os tipos são enviados simultaneamente quando disponíveis.</p>
          </>
        ),
      },
      {
        id: "notifications-excluir",
        title: "Excluir notificação",
        content: (
          <>
            <ol>
              <li>Na aba <strong>Enviadas</strong>, clique na notificação que deseja excluir.</li>
              <li>No modal de detalhes, clique em <strong>Excluir</strong> (botão vermelho).</li>
              <li>Confirme a exclusão no diálogo de confirmação.</li>
            </ol>
            <p>A exclusão é <strong>permanente para o embaixador</strong> — a notificação deixa de aparecer na central de notificações de todos os usuários. No banco de dados, o registro é preservado (soft delete) para auditoria.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "missions",
    icon: <Target size={18} />,
    title: "Missões",
    intro: <p>Crie missões para engajar os embaixadores com atividades específicas. Cada missão completada gera recompensa em pontos.</p>,
    subsections: [
      {
        id: "missions-criar",
        title: "Criar uma missão",
        content: (
          <>
            <ol>
              <li>Clique em <strong>+ Nova Missão</strong>.</li>
              <li>Preencha os campos obrigatórios.</li>
              <li>Configure a recorrência e verificação.</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "missions-campos",
        title: "Campos do formulário",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Campo</th><th>Descrição</th><th>Obrigatório</th></tr></thead>
              <tbody>
                <tr><td>Título</td><td>Nome da missão exibido no app</td><td>Sim</td></tr>
                <tr><td>Descrição</td><td>Instruções detalhadas para o embaixador. Explique claramente o que fazer</td><td>Sim</td></tr>
                <tr><td>Tipo de Ação</td><td>Convites aceitos / Engajamento, Participação em eventos, ou Compartilhamento de materiais</td><td>Sim</td></tr>
                <tr><td>Pontos</td><td>Recompensa em pontos ao completar a missão</td><td>Sim</td></tr>
                <tr><td>Recorrência</td><td>Frequência com que a missão pode ser refeita</td><td>Sim</td></tr>
                <tr><td>Qtd Necessária</td><td>Quantas vezes a ação deve ser realizada (ex: &quot;compartilhe 3 vezes&quot;)</td><td>Sim</td></tr>
                <tr><td>Limite de Tentativas</td><td>Máximo de submissões permitidas por embaixador (default: 3)</td><td>Não</td></tr>
                <tr><td>Limite Diário</td><td>Máximo de completações por dia. 0 = sem limite</td><td>Não</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "missions-verificacao",
        title: "Modos de verificação",
        content: (
          <>
            <p>Ao criar uma missão, escolha como a submissão do embaixador será validada:</p>
            <table className="doc-table">
              <thead><tr><th>Opção</th><th>O que acontece</th><th>Quando usar</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>Verificação manual</strong></td>
                  <td>A submissão vai para a fila de Moderação. Um administrador precisa aprovar ou rejeitar.</td>
                  <td>Missões que exigem comprovação (foto, documento, etc.)</td>
                </tr>
                <tr>
                  <td><strong>Aprovação automática</strong></td>
                  <td>A missão é completada imediatamente ao submeter, sem revisão.</td>
                  <td>Missões simples e de confiança (ex: &quot;Li o material&quot;, &quot;Assisti ao vídeo&quot;)</td>
                </tr>
                <tr>
                  <td><strong>Nenhuma marcada</strong></td>
                  <td>A missão é completada quando o progresso atinge a quantidade necessária.</td>
                  <td>Missões baseadas em contagem (ex: &quot;Compartilhe 5 conteúdos&quot;)</td>
                </tr>
              </tbody>
            </table>
            <div className="doc-callout">
              <strong>Atenção:</strong> &quot;Verificação manual&quot; e &quot;Aprovação automática&quot; são mutuamente exclusivas. Não é possível marcar ambas.
            </div>
          </>
        ),
      },
      {
        id: "missions-recorrencia",
        title: "Recorrência",
        content: (
          <>
            <p>Define com que frequência o embaixador pode completar a missão:</p>
            <table className="doc-table">
              <thead><tr><th>Tipo</th><th>Comportamento</th></tr></thead>
              <tbody>
                <tr><td><strong>Única</strong></td><td>O embaixador pode completar apenas uma vez. Após concluir, a missão desaparece da lista.</td></tr>
                <tr><td><strong>Diária</strong></td><td>O embaixador pode completar uma vez por dia. Resetada à meia-noite.</td></tr>
                <tr><td><strong>Semanal</strong></td><td>O embaixador pode completar uma vez por semana.</td></tr>
                <tr><td><strong>Por Evento</strong></td><td>Uma nova instância da missão é criada para cada evento.</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        id: "missions-destaque",
        title: "Destaque",
        content: (
          <p>Marque <strong>&quot;Destacar na tela inicial&quot;</strong> para que a missão apareça em posição de destaque no app. Ideal para missões urgentes ou campanhas especiais.</p>
        ),
      },
    ],
  },
  {
    id: "badges",
    icon: <Award size={18} />,
    title: "Conquistas",
    intro: <p>Conquistas são prêmios visuais que os embaixadores desbloqueiam ao atingir marcos específicos. Aparecem no perfil do embaixador.</p>,
    subsections: [
      {
        id: "badges-criar",
        title: "Criar uma conquista",
        content: (
          <>
            <ol>
              <li>Clique em <strong>+ Nova Conquista</strong>.</li>
              <li>Defina o nome e a descrição.</li>
              <li>Escolha o critério de desbloqueio (tipo e valor).</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "badges-criterios",
        title: "Critérios de desbloqueio",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Critério</th><th>Exemplo</th></tr></thead>
              <tbody>
                <tr><td><strong>Pontos Acumulados</strong></td><td>Desbloqueada ao atingir X pontos acumulados</td></tr>
                <tr><td><strong>Missões Concluídas</strong></td><td>Desbloqueada ao completar X missões</td></tr>
                <tr><td><strong>Eventos Comparecidos</strong></td><td>Desbloqueada ao participar de X eventos</td></tr>
                <tr><td><strong>Convites (Indicações)</strong></td><td>Desbloqueada ao convidar X pessoas</td></tr>
              </tbody>
            </table>
          </>
        ),
      },
    ],
  },
  {
    id: "levels",
    icon: <Trophy size={18} />,
    title: "Níveis",
    intro: <p>Configure os níveis de progressão dos embaixadores. Os níveis são baseados em pontos acumulados e são exibidos no perfil e no ranking.</p>,
    subsections: [
      {
        id: "levels-criar",
        title: "Criar um nível",
        content: (
          <>
            <ol>
              <li>Clique em <strong>+ Novo Nível</strong>.</li>
              <li>Defina o nome (ex: Apoiador, Mobilizador, Líder, Embaixador).</li>
              <li>Escolha a cor representativa.</li>
              <li>Informe os <strong>pontos mínimos</strong> necessários para atingir esse nível.</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </>
        ),
      },
      {
        id: "levels-como-funciona",
        title: "Como funciona a progressão",
        content: (
          <>
            <ul>
              <li>Embaixadores acumulam pontos ao completar missões e participar de eventos.</li>
              <li>Quando os pontos acumulados atingem o mínimo de um nível, o embaixador avança automaticamente.</li>
              <li>O nível é exibido no perfil, na listagem de usuários e no ranking.</li>
            </ul>
            <div className="doc-callout">
              <strong>Dica:</strong> O primeiro nível (menor pontuação) é o nível inicial de todos os novos embaixadores. Ordene os níveis do menor para o maior número de pontos.
            </div>
          </>
        ),
      },
    ],
  },
  {
    id: "points",
    icon: <Coins size={18} />,
    title: "Pontuações",
    intro: <p>Configure os valores padrão de pontos para cada tipo de ação na plataforma. Esses valores podem ser sobrescritos individualmente em cada missão ou evento.</p>,
    subsections: [
      {
        id: "points-acoes",
        title: "Ações configuráveis",
        content: (
          <>
            <table className="doc-table">
              <thead><tr><th>Ação</th><th>Descrição</th><th>Onde configura</th></tr></thead>
              <tbody>
                <tr><td>Compartilhamento</td><td>Pontos ao compartilhar um material</td><td>Pontuações + cada material</td></tr>
                <tr><td>Check-in em evento</td><td>Pontos ao fazer check-in</td><td>Pontuações + cada evento</td></tr>
                <tr><td>Convite validado</td><td>Pontos quando convidado completa o registro</td><td>Pontuações</td></tr>
                <tr><td>Missão completada</td><td>Pontos ao completar uma missão</td><td>Cada missão individualmente</td></tr>
              </tbody>
            </table>
            <div className="doc-callout">
              <strong>Dica:</strong> Mantenha um equilíbrio entre os valores para que todas as atividades sejam atrativas.
            </div>
          </>
        ),
      },
    ],
  },
  {
    id: "moderation",
    icon: <Shield size={18} />,
    title: "Moderação",
    intro: <p>Revise e aprove submissões de missões que foram configuradas com verificação manual. As submissões pendentes aparecem aqui automaticamente.</p>,
    subsections: [
      {
        id: "moderation-fluxo",
        title: "Fluxo de revisão",
        content: (
          <>
            <ol>
              <li>Um embaixador submete uma missão com verificação manual.</li>
              <li>A submissão aparece na lista com status <strong>&quot;Em Revisão&quot;</strong>.</li>
              <li>Clique na submissão para ver os detalhes: nome do embaixador, missão, evidência e data.</li>
              <li>Escolha uma ação:
                <ul>
                  <li><strong>Aprovar</strong> — Os pontos são creditados ao embaixador.</li>
                  <li><strong>Rejeitar</strong> — Informe o motivo. O embaixador é notificado e pode tentar novamente.</li>
                </ul>
              </li>
            </ol>
          </>
        ),
      },
      {
        id: "moderation-rejeicao",
        title: "Rejeição e retentativa",
        content: (
          <>
            <p>Quando uma submissão é rejeitada:</p>
            <ul>
              <li>O embaixador recebe uma notificação com o motivo da rejeição.</li>
              <li>Ele pode corrigir e reenviar a submissão.</li>
              <li>O número de tentativas é limitado pelo campo <strong>&quot;Limite de Tentativas&quot;</strong> configurado na missão (padrão: 3).</li>
              <li>Após esgotar as tentativas, a missão é marcada como finalizada sem pontos.</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    id: "audit",
    icon: <ScrollText size={18} />,
    title: "Auditoria",
    intro: <p>Registro completo de todas as ações realizadas no painel administrativo. Use para rastreabilidade e segurança.</p>,
    subsections: [
      {
        id: "audit-registros",
        title: "O que é registrado",
        content: (
          <>
            <ul>
              <li>Criação, edição e exclusão de eventos, conteúdos, missões e conquistas.</li>
              <li>Aprovação e rejeição de submissões na moderação.</li>
              <li>Alterações em configurações do sistema.</li>
              <li>Ativação e desativação de usuários.</li>
              <li>Logins e logouts de administradores.</li>
            </ul>
            <p>Cada registro inclui: <strong>quem</strong> realizou a ação, <strong>o que</strong> foi alterado e <strong>quando</strong>.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "settings",
    icon: <Settings size={18} />,
    title: "Configurações",
    intro: <p>Gerencie administradores, permissões e notificações automáticas do sistema.</p>,
    subsections: [
      {
        id: "settings-admins",
        title: "Administradores",
        content: (
          <>
            <ul>
              <li>Adicione novos administradores informando nome, e-mail e senha.</li>
              <li>Cada administrador pode ter <strong>permissões diferentes</strong> (ex: acessar apenas eventos, ou apenas conteúdos).</li>
              <li>Desative administradores que não devem mais acessar o painel.</li>
            </ul>
          </>
        ),
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */


export default function HelpPage() {
  const [activeSectionId, setActiveSectionId] = useState(DOCS[0].id);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeSection = DOCS.find(s => s.id === activeSectionId) || DOCS[0];

  const handleSectionClick = useCallback((id: string) => {
    setActiveSectionId(id);
    setActiveSubId(null);
    setMobileNavOpen(false);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToSub = useCallback((subId: string) => {
    setActiveSubId(subId);
    const el = document.getElementById(subId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleScroll = () => {
      const subs = activeSection.subsections;
      for (let i = subs.length - 1; i >= 0; i--) {
        const el = document.getElementById(subs[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) { setActiveSubId(subs[i].id); return; }
        }
      }
      setActiveSubId(null);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  return (
    <div className="docs-root">
      {/* Header */}
      <header className="docs-header">
        <button className="docs-mobile-btn" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileNavOpen
              ? <path d="M18 6L6 18M6 6l12 12" />
              : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
          </svg>
        </button>
        <div className="docs-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Central de Ajuda</span>
        </div>
        <span className="docs-brand-sub">Rede de Embaixadores</span>
      </header>

      <div className="docs-layout">
        {/* Left Nav */}
        <nav className={`docs-nav${mobileNavOpen ? " open" : ""}`}>
          <div className="docs-nav-heading">Seções</div>
          {DOCS.map(s => (
            <button key={s.id} onClick={() => handleSectionClick(s.id)} className={`docs-nav-item${activeSectionId === s.id ? " active" : ""}`}>
              <span className="docs-nav-icon">{s.icon}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>

        {mobileNavOpen && <div className="docs-overlay" onClick={() => setMobileNavOpen(false)} />}

        {/* Content */}
        <main className="docs-content" ref={contentRef}>
          <div className="docs-inner">
            <h1 className="docs-h1">{activeSection.title}</h1>
            <div className="docs-intro">{activeSection.intro}</div>
            {activeSection.subsections.map(sub => (
              <section key={sub.id} id={sub.id} className="docs-section">
                <h2 className="docs-h2">{sub.title}</h2>
                <div className="docs-body">{sub.content}</div>
              </section>
            ))}
          </div>
        </main>

        {/* Right TOC */}
        <aside className="docs-toc">
          <div className="docs-toc-heading">Nesta página</div>
          {activeSection.subsections.map(sub => (
            <button key={sub.id} onClick={() => scrollToSub(sub.id)} className={`docs-toc-link${activeSubId === sub.id ? " active" : ""}`}>
              {sub.title}
            </button>
          ))}
        </aside>
      </div>

      <style jsx global>{`
        .docs-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          color: var(--text);
        }
        .docs-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 0 var(--space-lg);
          height: 52px;
          min-height: 52px;
          border-bottom: 1px solid var(--separator);
          background: var(--surface);
        }
        .docs-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9375rem;
        }
        .docs-brand-sub {
          color: var(--text-tertiary);
          font-size: 0.8125rem;
          font-weight: 400;
          margin-left: var(--space-xs);
        }
        .docs-mobile-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }
        .docs-layout {
          display: grid;
          grid-template-columns: 220px 1fr 200px;
          flex: 1;
          min-height: 0;
          position: relative;
        }
        .docs-nav {
          border-right: 1px solid var(--separator);
          padding: var(--space-md) 0;
          overflow-y: auto;
          background: var(--surface);
        }
        .docs-nav-heading {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-tertiary);
          padding: 0 var(--space-md) var(--space-sm);
        }
        .docs-nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          width: 100%;
          padding: 9px var(--space-md);
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.9375rem;
          font-weight: 500;
          text-align: left;
          transition: all 0.15s ease;
          border-left: 2px solid transparent;
        }
        .docs-nav-item:hover {
          color: var(--text);
          background: var(--surface-elevated);
        }
        .docs-nav-item.active {
          color: var(--color-primary);
          background: var(--color-primary-50);
          border-left-color: var(--color-primary);
          font-weight: 600;
        }
        .docs-nav-icon { display: flex; flex-shrink: 0; opacity: 0.7; }
        .docs-nav-item.active .docs-nav-icon { opacity: 1; }
        .docs-content { overflow-y: auto; scroll-behavior: smooth; }
        .docs-inner {
          padding: var(--space-xl) var(--space-xl);
        }
        .docs-h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 var(--space-sm);
          letter-spacing: -0.02em;
        }
        .docs-intro {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--separator);
        }
        .docs-intro p { margin: 0; }
        .docs-section { margin-bottom: var(--space-xl); scroll-margin-top: 24px; }
        .docs-h2 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 var(--space-sm);
          padding-bottom: var(--space-xs);
          border-bottom: 1px solid var(--separator);
        }
        .docs-body { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.75; }
        .docs-body p { margin: var(--space-xs) 0; }
        .docs-body ul, .docs-body ol {
          list-style: none;
          padding: 0;
          margin: var(--space-sm) 0;
        }
        .docs-body ol { counter-reset: docs-counter; }
        .docs-body li { margin-bottom: 6px; }
        .docs-body ul > li::before {
          content: "• ";
          color: var(--text-tertiary);
        }
        .docs-body ol > li { counter-increment: docs-counter; }
        .docs-body ol > li::before {
          content: counter(docs-counter) ". ";
          color: var(--text-tertiary);
          font-weight: 500;
        }
        .docs-body ul ul, .docs-body ol ul { margin-top: 4px; padding-left: 1.5em; }
        .docs-body ul ul > li::before { content: "◦ "; }
        .docs-body strong { color: var(--text); }
        .docs-body code {
          background: var(--surface-elevated);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
        }
        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin: var(--space-sm) 0;
          font-size: 0.875rem;
          border: 1px solid var(--separator);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .doc-table th, .doc-table td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid var(--separator);
        }
        .doc-table th {
          color: var(--text);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--surface-elevated);
        }
        .doc-table tr:last-child td { border-bottom: none; }
        .doc-table tr:hover td { background: var(--surface-elevated); }
        .doc-callout {
          background: var(--color-primary-50);
          border-left: 3px solid var(--color-primary);
          padding: var(--space-sm) var(--space-base);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          margin: var(--space-base) 0;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .docs-toc {
          border-left: 1px solid var(--separator);
          padding: var(--space-lg) var(--space-sm);
          overflow-y: auto;
        }
        .docs-toc-heading {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-tertiary);
          padding: 0 var(--space-xs) var(--space-sm);
        }
        .docs-toc-link {
          display: block;
          width: 100%;
          padding: 6px var(--space-xs);
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-tertiary);
          font-size: 0.875rem;
          font-weight: 500;
          text-align: left;
          transition: all 0.15s ease;
          border-left: 2px solid transparent;
        }
        .docs-toc-link:hover { color: var(--text); }
        .docs-toc-link.active {
          color: var(--color-primary);
          border-left-color: var(--color-primary);
          font-weight: 600;
        }
        .docs-overlay { display: none; }

        @media (max-width: 1100px) {
          .docs-layout { grid-template-columns: 220px 1fr; }
          .docs-toc { display: none; }
        }

        @media (max-width: 768px) {
          .docs-header { padding: 0 var(--space-md); }
          .docs-mobile-btn { display: flex; }
          .docs-brand-sub { display: none; }
          .docs-layout { grid-template-columns: 1fr; }
          .docs-nav {
            display: none;
            position: fixed;
            top: 52px;
            left: 0;
            bottom: 0;
            width: 280px;
            z-index: 100;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
          }
          .docs-nav.open { display: block; }
          .docs-overlay {
            display: block;
            position: fixed;
            top: 52px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.3);
            z-index: 99;
          }
          .docs-inner { padding: var(--space-md); }
          .docs-h1 { font-size: 1.375rem; }
          .docs-h2 { font-size: 1rem; }
          .doc-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `}</style>
    </div>
  );
}
