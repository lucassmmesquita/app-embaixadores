# PRD — Rede de Embaixadores da Campanha

> **Documento de Requisitos de Produto (Product Requirements Document)**
> Versão 1.0 • Junho/2026 • Confidencial
> Este documento é a **fonte única de verdade** das regras de negócio. Toda decisão de implementação deve referenciá-lo. Em conflito entre código e PRD, o PRD prevalece (ou abre-se uma issue de atualização do PRD).

---

## 0. Como a IA de desenvolvimento deve usar este documento

- Leia **todo** este PRD antes de escrever qualquer linha de código.
- Consulte os arquivos de SKILL por papel (`/.antigravity/skills/*.md`) para padrões técnicos.
- Nunca invente regra de negócio: se algo estiver ambíguo, marque `// TODO(PRD): <pergunta>` e siga com a premissa mais conservadora.
- **Mobile-first** e **escalabilidade** são premissas, não features.
- **LGPD e legislação eleitoral (TSE)** são requisitos inegociáveis em cada fluxo que toque dado pessoal ou comunicação.

---

## 1. Visão de Produto

### 1.1 Objetivo
Transformar apoiadores passivos em **agentes ativos de mobilização cidadã**, por meio de uma plataforma de gamificação, reconhecimento e colaboração que amplia o alcance orgânico da campanha e forma lideranças locais.

### 1.2 Proposta de valor
- **Para o apoiador:** sentido de pertencimento, progressão visível, reconhecimento público e oportunidades reais (eventos, encontros com lideranças).
- **Para a campanha:** base ativa, alcance orgânico, presença territorial, dados de engajamento e funil de formação de lideranças.

### 1.3 Métricas de sucesso (North Star + suporte)
- **North Star:** nº de *missões concluídas por usuário ativo semanal* (mede mobilização real, não vaidade).
- Usuários ativos semanais (WAU) / mensais (MAU).
- Taxa de ativação (cadastro → 1ª missão concluída em ≤ 48h).
- Taxa de retenção D7 / D30.
- Coeficiente viral (convites enviados → cadastros validados).
- Nº de lideranças formadas (usuários que atingem nível ≥ 4).

### 1.4 Escopo deste ciclo
**MVP completo:** App do Participante **e** Painel da Campanha. Stack confirmada na seção 9.

### 1.5 Fora de escopo (explícito)
- Produção de conteúdo de propaganda, ataques a adversários ou material persuasivo atribuído a pessoas reais — a plataforma é **ferramenta**, não mensagem.
- Pagamentos / doações financeiras (regulação eleitoral própria; tratar em ciclo futuro com assessoria jurídica dedicada).
- Integração com urna/sistema eleitoral oficial.

---

## 2. Personas

| Persona | Perfil | Necessidade central | Restrição |
|---|---|---|---|
| **Apoiador novato** | Cidadão comum, baixa familiaridade digital, conexão móvel limitada | Entender rápido o que fazer e sentir progresso | UX autoexplicativa, baixo consumo de dados |
| **Embaixador engajado** | Apoiador recorrente, convida pessoas | Mais missões, reconhecimento, ranking | Precisa de feedback de impacto |
| **Líder comunitário** | Organiza encontros, coordena pessoas na sua região | Ferramentas de organização e visão da sua célula | Mobile, em campo |
| **Gestor de campanha** | Equipe estratégica/coordenação | Métricas, segmentação, relatórios por região | Desktop (painel web), decisões rápidas |
| **Coordenador regional** | Responsável por território | Monitorar lideranças e desempenho da região | Visão consolidada |

---

## 3. Jornada e Sistema de Níveis

### 3.1 Os 5 níveis
| # | Nível | Como se atinge (regra) | Desbloqueia |
|---|---|---|---|
| 1 | **Apoiador** | Cadastro concluído + e-mail/telefone verificado | Missões básicas, biblioteca, agenda |
| 2 | **Embaixador** | Atingir **X₂** pontos **e** concluir ≥ 3 missões distintas | Convites com rastreio, badges, ranking regional |
| 3 | **Mobilizador** | Atingir **X₃** pontos **e** ≥ 1 missão de organização concluída | Criar encontros locais, missões de equipe |
| 4 | **Líder Comunitário** | Atingir **X₄** pontos + **N** convidados ativos + aprovação da campanha | Gestão de célula local, conteúdos restritos, fóruns |
| 5 | **Coordenador de Rede** | Indicação/aprovação manual da campanha (não automático) | Visão de sub-rede, relatórios da sua área |

> **Parametrização:** os limiares `X₂…X₄` e `N` são **configuráveis pela campanha** (não hardcoded). Defaults sugeridos: X₂=100, X₃=400, X₄=1000, N=5. Armazenar em tabela de configuração versionada.

### 3.2 Regras de progressão
- Progressão é **monotônica** (não se perde nível por inatividade no MVP; reavaliar em ciclo futuro).
- Nível 4 e 5 exigem **aprovação humana** da campanha → existe estado `pending_approval`.
- Toda mudança de nível gera evento auditável e notificação ao usuário.

---

## 4. Sistema de Missões (núcleo do produto)

### 4.1 Tipos de missão
| Tipo | Descrição | Validação | Pontos (default) |
|---|---|---|---|
| `EVENT_ATTENDANCE` | Participar de evento/reunião | Check-in (geo + código do evento) | 50 |
| `CONTENT_SHARE` | Compartilhar conteúdo oficial | Confirmação + (opcional) link/deep-link rastreável | 10 |
| `INVITE` | Convidar novo voluntário | Convidado cadastra e **verifica** conta | 30 por convite validado |
| `ORGANIZE_MEETUP` | Organizar encontro comunitário | Criação do encontro + nº mínimo de presenças | 100 |
| `SPREAD_PROPOSAL` | Divulgar proposta | Confirmação (autodeclarada, peso menor) | 10 |
| `COLLECT_DEMAND` | Coletar demanda da população | Formulário estruturado submetido | 20 |
| `TRAINING` | Concluir treinamento/formação | Conclusão de módulo + quiz | 40 |

> Pontos são **configuráveis** por missão. Nunca hardcode; ler de `mission_templates`.

### 4.2 Estados da missão (do usuário)
`AVAILABLE → IN_PROGRESS → SUBMITTED → (VALIDATED | REJECTED) → COMPLETED`
- `SUBMITTED` aplica-se a missões com validação assíncrona.
- Missões autodeclaradas de baixo peso podem ir direto a `COMPLETED`.
- `REJECTED` permite re-submissão (limite configurável de tentativas).

### 4.3 Regras antifraude (essenciais)
- **Convite só pontua** quando o convidado **verifica** a conta (não no envio).
- **Anti self-invite:** bloquear convite para o próprio telefone/e-mail e duplicatas.
- **Rate limiting** por usuário por tipo de missão (ex.: máx. N compartilhamentos pontuáveis/dia).
- **Check-in de evento** exige código do evento + janela temporal + (opcional) raio geográfico.
- **Detecção de anomalia:** picos de pontuação suspeitos entram em fila de revisão manual.
- Toda concessão de ponto é **idempotente** (chave: usuário+missão+ocorrência).

### 4.4 Recorrência
- Missões podem ser `ONE_TIME`, `DAILY`, `WEEKLY` ou `PER_EVENT`. O motor respeita janelas e cooldowns.

---

## 5. Pontos, Ranking e Reconhecimento

### 5.1 Pontuação
- Pontos são creditados **somente após validação** (ou autodeclaração de baixo peso).
- Toda transação de ponto é registrada em **ledger imutável** (`point_transactions`) com origem rastreável — nunca um simples contador mutável.
- Saldo do usuário = soma do ledger (ou snapshot materializado para performance, reconciliado periodicamente).

### 5.2 Ranking / Leaderboards
- Rankings: **global**, **regional** (estado/município/zona), **por equipe/célula** e **por período** (semanal/mensal/all-time).
- Implementação com **Redis Sorted Sets** para baixa latência; PostgreSQL como fonte de verdade.
- Empate: desempate por data de atingimento (quem chegou primeiro).
- Exibir posição do usuário mesmo fora do top-N ("você está em #1.245").

### 5.3 Reconhecimento
- **Badges/conquistas:** por marcos (1º convite, 10 eventos, 1ª formação, etc.). Catálogo configurável.
- **Certificados digitais:** gerados sob demanda (PDF) ao concluir formações/atingir níveis; armazenados em Object Storage + CDN.
- **Destaques na comunidade:** vitrine de top contribuidores (respeitando opt-in de exposição pública — ver LGPD §8).
- **Convites a eventos exclusivos / encontros com lideranças:** liberados por nível ou seleção manual.
- **Fóruns de discussão/construção de propostas:** acesso por nível.

---

## 6. Área do Participante (App Mobile — React Native)

### 6.1 Telas/funcionalidades
1. **Onboarding & Cadastro** — fluxo curto, verificação (OTP SMS/e-mail), aceite de termos + consentimento LGPD granular.
2. **Home / Missões** — missões disponíveis com clareza de "o que fazer e quanto vale"; CTA único e óbvio.
3. **Perfil** — dados, nível atual, barra de progresso para o próximo nível, badges.
4. **Histórico de atividades** — timeline de missões e pontos (transparência do ledger).
5. **Ranking & Conquistas** — leaderboards filtráveis + galeria de badges.
6. **Agenda de eventos** — eventos da campanha, RSVP, check-in.
7. **Biblioteca de materiais oficiais** — conteúdos para compartilhar (com cache offline).
8. **Convidar** — link/deep-link de convite rastreável + acompanhamento dos convidados.
9. **Notificações** — push (FCM) + central in-app.

### 6.2 Requisitos de UX (não negociáveis)
- Feedback **imediato e gratificante** de progresso (animação de pontos, confete em conquista — leve).
- Funciona em **conexão limitada**: estados de loading/skeleton, cache, otimismo de UI, retry.
- **Acessibilidade:** contraste AA, alvos de toque ≥ 44px, suporte a leitor de tela, fontes escaláveis.
- Curva de aprendizado mínima: telas autoexplicativas, sem jargão.

---

## 7. Área da Campanha (Painel Web — Next.js)

### 7.1 Módulos
1. **Gestão de voluntários** — busca, filtros, perfil do voluntário, aprovação de nível 4/5, suspensão.
2. **Painel de métricas & engajamento** — WAU/MAU, ativação, retenção, missões concluídas, funil de níveis.
3. **Comunicação segmentada** — criar/segmentar campanhas de notificação (push/e-mail) por região, nível, atividade.
4. **Gestão de eventos** — CRUD de eventos, códigos de check-in, controle de presença.
5. **Gestão de missões** — CRUD de templates de missão, pontos, recorrência, ativação.
6. **Monitoramento de lideranças locais** — visão por célula/região, saúde das lideranças.
7. **Relatórios por região e equipe** — exportáveis (CSV/PDF), com filtros temporais e territoriais.
8. **Moderação/antifraude** — fila de revisão de missões suspeitas e submissões.
9. **Auditoria & administração** — RBAC, logs de ações administrativas.

### 7.2 RBAC (papéis administrativos)
`SUPER_ADMIN` (config global) • `CAMPAIGN_MANAGER` (operação) • `REGIONAL_COORDINATOR` (só sua região) • `MODERATOR` (fila antifraude) • `ANALYST` (somente leitura/relatórios). Toda ação sensível é logada.

---

## 8. Privacidade, LGPD e Legislação Eleitoral (INEGOCIÁVEL)

> ⚠️ **Regra geral:** sempre que um fluxo tocar dado pessoal, consentimento, segmentação ou prestação de contas, **sinalize a implicação no código/PR** e, em zona regulatória sensível, **recomende validação jurídica**. A IA informa, não substitui aconselhamento legal.

### 8.1 LGPD
- **Consentimento granular** no cadastro: (a) tratamento de dados, (b) comunicação, (c) exposição pública em ranking. Cada um com registro de data/versão do termo.
- **Base legal** explícita por finalidade; dados mínimos necessários (minimização).
- **Direitos do titular:** acesso, correção, portabilidade e **exclusão** (fluxo de "apagar minha conta" com anonimização do histórico, preservando integridade agregada).
- **Dados sensíveis:** não coletar opinião política como dado estruturado além do necessário; tratar com cuidado redobrado.
- **Hospedagem em região brasileira** (São Paulo), criptografia em trânsito e repouso, dados auditáveis.
- **DPO/contato** e política de privacidade acessíveis no app.
- **Retenção:** definir prazos; campanha tem vida curta → plano de descomissionamento e expurgo pós-eleição.

### 8.2 Legislação eleitoral (TSE)
- **Comunicação segmentada** deve respeitar regras de propaganda eleitoral e anti-spam; registrar consentimento e oferecer **opt-out** em todo disparo.
- **Sem doações/pagamentos** neste ciclo (fora de escopo).
- **Transparência:** logs de comunicação para eventual prestação de contas.
- Pontos marcados `// LEGAL-REVIEW` no código sempre que houver disparo em massa, coleta de dado de terceiro (convidado) ou segmentação geográfica de mensagem.

---

## 9. Arquitetura & Stack (confirmada)

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend/API | **Python + FastAPI** | Assíncrono, OpenAPI, validação Pydantic |
| Processamento assíncrono | **Celery + fila (SQS/Pub-Sub)** | Motor de gamificação, pontos, badges, notificações |
| Banco de dados | **PostgreSQL gerenciado** | Fonte de verdade; alta disponibilidade |
| Cache/ranking | **Redis** | Leaderboards (sorted sets), sessões, cache |
| App móvel | **React Native** | iOS + Android, base única (decisão: reuso de skills React) |
| Painel web | **React / Next.js** | Área da campanha |
| Mídia/arquivos | **Object Storage + CDN** | Certificados, materiais, imagens |
| Notificações | **FCM + e-mail transacional** | Push gratuito + e-mail |
| Infra | **Containers (Docker) + autoescala** | Cloud Run (GCP) **recomendado**; ECS/Fargate (AWS) alternativa |
| Segurança | **WAF + criptografia + LGPD** | Contexto político = alvo frequente |
| Observabilidade | **Logs, métricas, alertas** | Saúde, desempenho e custo |

**Recomendação de nuvem:** GCP + Cloud Run (escala a zero entre eventos, cobrança por requisição — casa com sazonalidade). AWS é alternativa sólida se a equipe dominar o ecossistema. Diferença de custo < 10%.

---

## 10. Modelo de Dados (alto nível)

Entidades centrais (detalhe de schema no SKILL de Backend):
- `users` (perfil, nível, status, região, consentimentos)
- `consents` (versão do termo, finalidade, timestamp)
- `mission_templates` (tipo, pontos, recorrência, validação, ativo)
- `user_missions` (estado, submissões, evidências)
- `point_transactions` (ledger imutável)
- `levels_config` (limiares parametrizáveis)
- `badges` / `user_badges`
- `events` / `event_checkins`
- `invitations` (inviter, convidado, status de validação)
- `teams` / `cells` (célula/região)
- `regions` (estado/município/zona)
- `notifications` / `notification_campaigns`
- `admin_users` / `roles` / `audit_logs`
- `reports` (materializações/snapshots)

---

## 11. Requisitos Não-Funcionais

- **Escala:** 200.000 usuários cadastrados; suportar picos súbitos (debates, virais) sem degradação. Arquitetura elástica/autoescalável.
- **Performance:** p95 de API < 300ms em leitura; leaderboards < 100ms (Redis).
- **Disponibilidade:** alvo 99.9% em período eleitoral.
- **Segurança:** WAF, rate limiting, proteção DDoS, criptografia, secrets gerenciados, sem credencial em código.
- **Idempotência** em toda concessão de ponto e validação de missão.
- **Observabilidade:** logs estruturados, métricas de negócio + infra, alertas de custo.
- **Internacionalização:** PT-BR (base), preparado para i18n.
- **Offline-tolerante** no app (cache de biblioteca/agenda).

---

## 12. Roadmap incremental (orientação de entrega)

> Mesmo construindo "tudo", entregar em **fatias verticais funcionais**, não horizontais.

- **Fase 1 — Fundação:** auth + cadastro + consentimento LGPD + perfil + nível 1. Painel: usuários + RBAC.
- **Fase 2 — Núcleo de gamificação:** motor de missões + ledger de pontos + 3 tipos de missão (INVITE, EVENT, CONTENT_SHARE) + badges. Painel: CRUD de missões e eventos.
- **Fase 3 — Mobilização:** ranking (Redis) + agenda/check-in + convites rastreáveis + biblioteca.
- **Fase 4 — Campanha avançada:** métricas/relatórios + comunicação segmentada + moderação/antifraude + níveis 4/5 com aprovação.
- **Fase 5 — Polimento:** certificados, fóruns, otimização de custo (escala a zero, arquivamento), hardening de segurança.

---

## 13. Critérios de "Pronto" (Definition of Done global)

Uma feature só está pronta quando: atende à regra do PRD • tem testes (unit + integração nos fluxos críticos) • respeita LGPD/TSE com pontos `// LEGAL-REVIEW` sinalizados • é mobile-first e acessível • tem observabilidade • passou em revisão de QA e de segurança • idempotência verificada onde houver concessão de pontos.
