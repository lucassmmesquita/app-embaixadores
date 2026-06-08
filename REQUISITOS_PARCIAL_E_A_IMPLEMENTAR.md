# Rede de Embaixadores — Requisitos Parciais e a Implementar

**Especificação técnica end-to-end para funcionamento completo do aplicativo**

| | |
|---|---|
| **Versão** | 1.0 |
| **Data** | Junho de 2026 |
| **Escopo** | Apenas requisitos com status **Parcial** e **A Implementar** |
| **Objetivo** | Levar cada fluxo a funcionar de ponta a ponta (frontend ↔ API ↔ banco ↔ integrações) |
| **Repositório** | `github.com/lucassmmesquita/app-embaixadores` |
| **Stack** | Expo/React Native · FastAPI · SQLAlchemy · Supabase/PostgreSQL · Redis (previsto) · FCM (previsto) |

---

## Como ler este documento

Cada requisito é especificado em quatro camadas, para que seja diretamente acionável por quem for implementar:

- **Estado atual** — o que já existe no código e por que ainda não funciona ponta a ponta.
- **Backend** — endpoints, schemas, serviços, migrations e regras a criar ou ajustar.
- **Frontend** — telas, componentes, estados (carregando/vazio/erro), navegação e chamadas.
- **Aceite (DoD)** — critérios objetivos e verificáveis de "pronto".

Convenções de status usadas aqui:

- 🟡 **Parcial** — existe estrutura (tela, rota, contrato), mas falta comportamento, integração ou regra.
- 🔴 **A Implementar** — não há implementação observável; precisa ser construído.

> **Nota de fundação:** o backend já possui um motor de gamificação **idempotente** (`GamificationEngine.award_points` com `idempotency_key` único em `point_transactions`), máquina de estados de missão, leaderboard, verificação por admin e auditoria. Boa parte do esforço restante está em **(1)** conectar o frontend de verdade (remover *fallbacks* silenciosos), **(2)** telas ausentes, e **(3)** integrações externas (push, upload, certificados, Redis). Há também **inconsistências de schema** que quebram fluxos e precisam ser resolvidas antes do go-live (ver Seção 0).

---

## Seção 0 — Bloqueadores transversais (resolver PRIMEIRO)

Estes itens afetam vários fluxos ao mesmo tempo. Se não forem resolvidos, missões, pontos e navegação falham de forma difícil de diagnosticar.

### BLK-01 🔴 Divergência de schema entre migration SQL e modelos/serviços Python

**Estado atual.** A migration `001_initial_schema.sql` e o código Python descrevem a **mesma tabela de formas diferentes**. Isso faz `submit`/`verify` e filtros quebrarem contra o banco real.

| Campo / Enum | Migration `001` (banco real) | Código Python (schemas/service) | Efeito |
|---|---|---|---|
| Coluna de recorrência | `missions.mission_type` (`one_time`,`recurring`,`daily`,`weekly`,`challenge`) | usa `recurrence` (`ONE_TIME`,`DAILY`,`WEEKLY`,`PER_EVENT`) | Filtro e regra de recorrência não batem |
| Verificação | `verification_type` (`auto`,`photo`,`admin_approval`,`gps`) | usa `requires_verification` + `verification_type` | Estado de revisão inconsistente |
| Status de `user_missions` | `in_progress`,`pending_verification`,`completed`,`expired`,`cancelled` | `in_progress`,`submitted`,`completed`,`rejected` | `submit` grava status inexistente no CHECK → erro |
| Evidência | `user_missions.evidence_url` (única) | service referencia `submission_count`, `max_submissions`, `rejected_reason`, `submitted_at` | Colunas inexistentes → exceção SQL |
| Pontos materializados | `profiles.total_points` | engine atualiza `Profile.total_points` | OK, manter |

**Ação (decisão de fonte única).** Adotar o **vocabulário do código Python** (mais alinhado ao PRD §4.2: `AVAILABLE → IN_PROGRESS → SUBMITTED → VALIDATED/REJECTED → COMPLETED`) e **migrar o banco** para ele. Criar `004_fix_missions_schema.sql`:

```sql
-- 004_fix_missions_schema.sql
BEGIN;

-- 1) Recorrência: renomear e re-padronizar enum
ALTER TABLE missions RENAME COLUMN mission_type TO recurrence;
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_mission_type_check;
UPDATE missions SET recurrence = upper(recurrence);
UPDATE missions SET recurrence = 'ONE_TIME'  WHERE recurrence IN ('ONE_TIME','RECURRING','CHALLENGE');
ALTER TABLE missions ADD CONSTRAINT missions_recurrence_check
  CHECK (recurrence IN ('ONE_TIME','DAILY','WEEKLY','PER_EVENT'));

-- 2) Campos de submissão/antifraude que o service usa
ALTER TABLE missions ADD COLUMN IF NOT EXISTS max_submissions INT NOT NULL DEFAULT 3;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS max_daily_completions INT NOT NULL DEFAULT 0;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS is_self_declared BOOLEAN NOT NULL DEFAULT false;

-- 3) user_missions: novo conjunto de status + colunas usadas pelo service
ALTER TABLE user_missions DROP CONSTRAINT IF EXISTS user_missions_status_check;
UPDATE user_missions SET status = 'submitted' WHERE status = 'pending_verification';
UPDATE user_missions SET status = 'completed' WHERE status NOT IN
  ('in_progress','submitted','completed','rejected');
ALTER TABLE user_missions ADD CONSTRAINT user_missions_status_check
  CHECK (status IN ('in_progress','submitted','completed','rejected'));
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS submission_count INT NOT NULL DEFAULT 0;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE user_missions ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4) Índices de leitura quente
CREATE INDEX IF NOT EXISTS ix_user_missions_user_status ON user_missions(user_id, status);
CREATE INDEX IF NOT EXISTS ix_missions_active_featured ON missions(is_active, is_featured);

COMMIT;
```

**Aceite.** `POST /missions/{id}/submit` e `/verify` executam sem erro de SQL; `GET /missions?is_featured=true` retorna; testes de integração de missão passam contra o banco migrado.

---

### BLK-02 🟡 *Fallback* silencioso engole erros em todas as telas de dados

**Estado atual.** Telas como `home`, `ranking`, `missions`, `profile`, `event/[id]` capturam erros com `catch { /* placeholder */ }` ou `catch { // silent }`. Resultado: quando a API falha, o usuário vê tela vazia ou dados de exemplo, sem entender que algo deu errado e **sem como tentar de novo**.

**Frontend (padrão obrigatório).** Criar um *hook* e componentes reutilizáveis e aplicá-los em **todas** as telas que carregam dados:

```typescript
// app/hooks/useAsync.ts
import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | null; loading: boolean; error: Error | null };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: e as Error });
    }
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
```

Componentes de estado a criar em `app/components/ui/`:

- `Skeleton.tsx` — blocos *shimmer* para listas e cartões (substitui spinners genéricos).
- `EmptyState.tsx` — ícone + título + descrição + ação opcional (ex.: "Nenhuma missão agora").
- `ErrorState.tsx` — mensagem amigável + botão **"Tentar novamente"** que chama `reload()`.
- `Toast.tsx` — feedback não bloqueante de sucesso/erro de ações.

**Regra:** nenhum `catch` pode ficar vazio. Todo `catch` ou seta `error` (telas) ou dispara `Toast` (ações).

**Aceite.** Desligando o backend, cada tela mostra `ErrorState` com "Tentar novamente" (não dados falsos); religando e tocando no botão, a tela carrega. Em lista vazia legítima, aparece `EmptyState`.

---

### BLK-03 🔴 Refresh token e interceptação de 401 ausentes

**Estado atual.** O `authStore` guarda `accessToken`/`refreshToken` e persiste em `AsyncStorage`. O `ApiService` injeta o *bearer*, mas **não trata expiração**: um 401 vira `Error` genérico e o usuário é efetivamente deslogado no meio de uma ação. Há `POST /auth/refresh` no backend, porém o cliente não o usa automaticamente.

**Frontend.** Implementar refilamento (*single-flight*) no `ApiService.request`:

```typescript
// dentro de ApiService
private refreshing: Promise<string | null> | null = null;

private async tryRefresh(): Promise<string | null> {
  if (this.refreshing) return this.refreshing;     // single-flight
  this.refreshing = (async () => {
    try {
      const rt = useAuthStore.getState().refreshToken;
      if (!rt) return null;
      const r = await this.refreshToken(rt);        // POST /auth/refresh
      useAuthStore.getState().setTokens(r.access_token, r.refresh_token);
      return r.access_token;
    } catch { useAuthStore.getState().logout(); return null; }
    finally { this.refreshing = null; }
  })();
  return this.refreshing;
}

// no request(): se 401 e não for a própria rota de refresh → tentar 1x
if (response.status === 401 && !endpoint.includes('/auth/refresh')) {
  const newToken = await this.tryRefresh();
  if (newToken) return this.request<T>(endpoint, { ...options, token: newToken });
}
```

**Aceite.** Com `access_token` expirado, a próxima chamada renova de forma transparente e a ação conclui; se o `refresh_token` também expirou, o usuário é levado ao login uma única vez (sem loop).

---

### BLK-04 🔴 Variável de ambiente da API e configuração de build

**Estado atual.** `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'`. Sem `.env` definido, builds de dispositivo apontam para `localhost` (inacessível no celular) e falham silenciosamente (ver BLK-02).

**Ação.** Documentar e versionar `app/.env.example` com `EXPO_PUBLIC_API_URL=https://app-embaixadores.onrender.com`; garantir `app.config` lendo a var; CORS do backend já permite origens configuráveis (`API_CORS_ORIGINS`).

**Aceite.** App em dispositivo físico conversa com a API de produção sem ajuste manual de código.

---

## Seção 1 — Onboarding e Autenticação

### RF-ONB-03 🟡 Ações "Pular" e "Começar" no onboarding

**Estado atual.** Slides existem e a flag de conclusão é persistida. Falta garantir que **todos** os slides tenham "Pular" e que o último leve ao cadastro, ambos gravando a flag.

**Frontend.** Em `(auth)/onboarding.tsx`: botão "Pular" fixo no topo em todos os slides; no último slide, CTA "Começar" → `AsyncStorage.setItem('@onboarding_completed','true')` → `router.replace('/(auth)/register')`. "Pular" faz o mesmo, indo para `/(auth)/login`.

**Aceite.** Em qualquer slide, "Pular" encerra o onboarding e não reaparece em aberturas futuras; "Começar" leva ao cadastro.

---

### RF-ONB-04 🟡 Acessibilidade do onboarding

**Frontend.** Adicionar `accessibilityRole`, `accessibilityLabel` nos slides e botões; garantir contraste AA do texto sobre as cores de destaque; `accessible` nos `Pressable` com área ≥ 44×44.

**Aceite.** Leitor de tela anuncia título/descrição de cada slide e os botões; auditoria de contraste passa em AA.

---

### RF-AUTH-03 🟡 Validação e erros específicos no login

**Estado atual.** Login funcional via `authStore.login`, mas mensagens de erro são genéricas (`Alert` com `error.message`).

**Frontend.** Validar e-mail (regex) e senha (≥ 6) antes do envio, com erro por campo. Mapear erros do backend para mensagens claras: credenciais inválidas, conta inexistente, conta suspensa (`is_active=false`), sem conexão (distinguir falha de rede de 4xx/5xx).

**Aceite.** Cada cenário de erro mostra mensagem específica próxima ao campo/contexto, não um alerta genérico.

---

### RF-AUTH-04 🟡 Estado de carregamento e bloqueio de duplo envio

**Frontend.** Usar `isLoading` do `authStore` para desabilitar o botão e exibir spinner; ignorar toques repetidos durante a requisição.

**Aceite.** Toques múltiplos no botão de login disparam **uma** requisição; botão mostra progresso.

---

### RF-AUTH-05 🟡 Restauração de sessão na abertura

**Estado atual.** `authStore` persiste token/usuário com `persist` + `AsyncStorage`. Falta **reinjetar** o token no `ApiService` na hidratação (hoje `api.setToken` só é chamado em login/registro), senão a primeira chamada após reabrir o app vai sem *bearer*.

**Frontend.** Adicionar `onRehydrateStorage` no `persist` para chamar `api.setToken(state.accessToken)`; opcionalmente revalidar com `refreshProfile()`.

```typescript
persist(/* ... */, {
  name: 'auth-storage',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user, isAuthenticated: s.isAuthenticated }),
  onRehydrateStorage: () => (state) => { if (state?.accessToken) api.setToken(state.accessToken); },
})
```

**Aceite.** Após fechar e reabrir o app, o usuário continua logado e a primeira requisição autenticada funciona.

---

### RF-AUTH-06 🔴 Renovação automática de token

Coberto por **BLK-03**. Aceite idêntico.

---

### RF-AUTH-07 🔴 Login social (Google/Apple)

**Estado atual.** Schema `SocialLoginRequest` existe no backend (`provider`, `access_token`), mas **não há rota** nem fluxo no app.

**Backend.** Criar `POST /auth/social` no `auth/router.py` consumindo `SocialLoginRequest`; no `AuthService`, validar o token do provedor via Supabase OAuth e criar/associar `Profile` (reusar criação de perfil do `register`, com consentimento de tratamento de dados obrigatório capturado no primeiro acesso).

**Frontend.** Tela de login: botões "Continuar com Google/Apple" usando `expo-auth-session`/`expo-web-browser` (Apple apenas iOS). Após obter `access_token` do provedor, chamar `api.socialLogin(provider, token)` → mesmo *flow* de sessão.

**Dependências.** Configurar provedores no painel Supabase; *bundle id*/SHA no Google/Apple; *deep link* de retorno.

**Aceite.** Usuário entra com Google (Android/iOS) e Apple (iOS), perfil é criado/associado e a sessão funciona como no login por senha; consentimento LGPD é coletado no primeiro acesso social.

---

### RF-AUTH-11 🟡 Validação de campos no cadastro

**Frontend.** Em `(auth)/register.tsx`: validar nome (≥ 2), e-mail, senha (regra mínima e indicador de força), confirmação; erro por campo, não `Alert` único.

**Aceite.** Submeter com qualquer campo inválido destaca o campo e impede o envio; mensagens específicas.

---

### RF-AUTH-12 🟡 Máscara e teclado de telefone (BR)

**Frontend.** Máscara `(99) 99999-9999`, `keyboardType="phone-pad"`, normalização para E.164 antes do envio (`+55`). Cidade/estado opcionais com seleção a partir de `GET /users/regions/all`.

**Aceite.** Telefone é formatado ao digitar e enviado normalizado; backend aceita o formato.

---

### RF-AUTH-13 🔴 Código de indicação no cadastro

**Estado atual.** O `register` do app já envia `referral_code` opcional; o `RegisterRequest` aceita. Falta **vincular** o convite de origem e validar o código.

**Backend.** No `AuthService.register`: se `referral_code` presente, resolver o `Profile` dono do código (`referral_code` único em `profiles`), gravar `profiles.referred_by = inviter_id` e marcar a `invitation` correspondente como `registered` (ver RF-INV-04). Recusar/avisar se o código for inválido (não bloquear cadastro — apenas ignorar com aviso, decisão conservadora).

**Frontend.** Pré-preencher o campo quando o app é aberto por *deep link* de convite (ver RF-INV-02). Mostrar "convite aplicado" quando válido.

**Aceite.** Cadastro com código válido grava `referred_by`, marca o convite como `registered`, e o convidador passa a ver o convidado em "Meus convites".

---

### RF-AUTH-14 🔴 Verificação de contato (OTP) pós-registro

**Estado atual.** PRD §3.1 exige e-mail/telefone verificado para o nível Apoiador. Não há tela nem disparo.

**Backend.** Endpoints novos no módulo auth:

- `POST /auth/verify/send` — body `{ channel: 'email'|'sms' }` → dispara OTP (e-mail via Supabase; SMS via provedor — ver Dependências). Gera código de 6 dígitos com expiração (5 min) e *rate limit* (reusar `shared/rate_limiter`).
- `POST /auth/verify/confirm` — body `{ channel, code }` → valida, marca `profiles.email_verified`/`phone_verified = true`. Quando o critério do nível 1 é satisfeito, dispara `GamificationEngine` para consolidar nível Apoiador e notificação.

**Frontend.** Tela `(auth)/verify.tsx`: input de 6 dígitos, reenvio com *cooldown* (60s), escolha do canal. Inserir no fluxo: após `register`, redirecionar para `verify` antes da home.

**Dependências.** Provedor de SMS (ex.: Zenvia/Twilio) — **ponto de custo e de revisão jurídica** (consentimento e LGPD para envio a telefone). E-mail OTP pode usar Supabase.

**Aceite.** Novo usuário recebe e confirma o código; `email_verified`/`phone_verified` viram `true`; só então alcança a home como Apoiador verificado; reenvio respeita *cooldown*.

---

### RF-AUTH-15 🟡 Termos e Política dentro do app

**Estado atual.** Cadastro abre Política via `Linking.openURL` (link externo).

**Frontend.** Criar telas in-app `legal/terms.tsx` e `legal/privacy.tsx` (conteúdo em Markdown/HTML versionado em assets), abertas como modal. Manter link externo como alternativa.

**Aceite.** Usuário lê Termos e Política sem sair do app; versão exibida bate com a versão registrada no consentimento.

---

### RF-AUTH-16/17/18 🔴 Recuperação de senha (fluxo completo)

**Estado atual.** Não há tela nem endpoint dedicados.

**Backend.** Usar Supabase Auth: `POST /auth/password/forgot` (body `{ email }`) → dispara e-mail de redefinição; `POST /auth/password/reset` (body `{ token, new_password }`). Resposta de "forgot" **não revela** se o e-mail existe.

**Frontend.** `(auth)/forgot.tsx` (solicitar) e `(auth)/reset.tsx` (definir nova senha, aberta via *deep link* do e-mail). Link "Esqueci minha senha" no login.

**Aceite.** Usuário solicita redefinição, recebe e-mail, define nova senha e loga; mensagem de envio é neutra quanto à existência da conta.

---

## Seção 2 — Início (Home)

### RF-HOME-02 🟡 Barra de progresso para o próximo nível

**Estado atual.** `home` lê `stats.progress_percentage`; o backend (`UserStats`) já calcula `points_to_next_level`, `next_level_name`, `progress_percentage`. Falta exibir números (faltam X pts) e o nome do próximo nível, e tratar topo de carreira (nível 5 → sem "próximo").

**Frontend.** Mostrar barra + "faltam N pts para {next_level_name}"; se `current_level_order` for o máximo, exibir estado de "nível máximo".

**Aceite.** A home mostra percentual, pontos faltantes e próximo nível reais; no nível 5, mensagem de topo.

---

### RF-HOME-03 🟡 Missões em destaque com CTA

**Estado atual.** Carrega 3 missões via `getMissions(1, undefined, true)`. Tipagem usa `any`; falta CTA por cartão e tratamento de vazio/erro.

**Frontend.** Tipar com `Mission`; cada cartão navega para `mission/[id]`; usar `Skeleton`/`EmptyState`/`ErrorState`.

**Aceite.** Cartões de destaque levam ao detalhe correto; sem destaques, `EmptyState`; com erro, `ErrorState`.

---

### RF-HOME-05 🔴 Estados de carregamento/vazio/erro

Aplicar **BLK-02** à home. **Aceite** conforme BLK-02.

---

### RF-HOME-06 🟡 Atalhos (Convidar, Eventos, Biblioteca)

**Frontend.** Cartões de atalho com navegação: Convidar → `invite/index` (RF-INV-03), Eventos → `(tabs)/events`, Biblioteca → `content/index`.

**Aceite.** Cada atalho abre a tela correta.

---

### RF-HOME-07 🟡 Indicador de notificações não lidas

**Estado atual.** Central existe; falta o *badge* de contagem na home/*tab bar* usando `GET /notifications/unread-count`.

**Frontend.** Buscar contagem ao focar a tela; mostrar *badge* numérico; ao abrir a central, zera ao marcar como lidas. Atualizar via *polling* leve (ex.: ao focar) até push (RF-NOT-05).

**Aceite.** *Badge* reflete a contagem real e some quando tudo é lido.

---

### RF-HOME-08 🔴 Feedback de gamificação (animação de pontos / level up)

**Estado atual.** `event/[id]` já tem animação de pontos local; falta um mecanismo **global** que reaja a `award_points` (que retorna `level_up` e `new_badges`).

**Frontend.** Criar `components/feedback/RewardOverlay.tsx` (confete leve + "+N pontos" + modal de "Subiu de nível!"/"Novo badge!"). Disparar a partir de um *store* de gamificação que recebe o resultado de submissões/check-ins/compartilhamentos. Respeitar "leve" (sem travar UI; animação ≤ 1,5s, *reanimated*).

**Aceite.** Ao concluir qualquer ação que pontua, o usuário vê o ganho; ao cruzar limiar de nível, vê a celebração; ao ganhar badge, vê o aviso.

---

## Seção 3 — Missões

> Pré-requisito: **BLK-01** resolvido.

### RF-MIS-01 🟡 Lista de missões (campos e contrato)

**Estado atual.** `missionStore.loadMissions` consome `GET /missions`; tela existe. Falta exibir categoria/recorrência, e a tipagem precisa refletir o schema final (após BLK-01).

**Frontend.** Cartão com título, descrição curta, **pontos**, categoria (ícone/cor de `MissionCategory`) e selo de recorrência (Única/Diária/Semanal/Por evento).

**Aceite.** Lista mostra todos os campos; valores conferem com o backend.

---

### RF-MIS-02 🟡 Filtros e paginação

**Estado atual.** `getMissions(page, categoryId, featured)` aceita filtros; UI não expõe categorias nem *scroll* infinito.

**Frontend.** Barra de categorias (de `getMissionCategories`); paginação por *scroll* infinito (incrementar `page`, anexar `items`, parar quando `items.length < page_size`). Preservar filtro ao paginar.

**Aceite.** Filtrar por categoria recarrega a lista; rolar carrega próximas páginas sem duplicar.

---

### RF-MIS-03 🔴 Diferenciar estados (disponível/andamento/revisão/concluída)

**Estado atual.** `getMissionsByStatus` existe no *store*, mas a lista não cruza missões com `myMissions`.

**Frontend.** Ao montar a lista, mesclar com `myMissions` (por `mission.id`) e rotular cada cartão pelo `UserMission.status` (in_progress/submitted/completed/rejected). Concluídas com selo e *check*; em revisão com relógio; rejeitadas com motivo (`rejected_reason`) e CTA "tentar novamente" se `submission_count < max_submissions`.

**Aceite.** O mesmo conjunto de missões mostra o estado correto por usuário; rejeitada exibe motivo e permite renovar tentativa dentro do limite.

---

### RF-MIS-04 🔴 Estados de carregamento/vazio/erro (missões)

Aplicar **BLK-02**. **Aceite** conforme BLK-02 (vazio: "Nenhuma missão disponível agora").

---

### RF-MIS-05 🔴 Respeitar nível do usuário (`min_level_id`)

**Estado atual.** `missions.min_level_id` existe no banco; nem backend nem frontend bloqueiam.

**Backend.** No `MissionService.start_mission`, validar que `profile.current_level.order_index >= mission.min_level.order_index`; senão `BadRequestException("Disponível a partir do nível X")`. Opcional: expor `locked: bool` em `MissionResponse` para a UI.

**Frontend.** Renderizar missões acima do nível com cadeado e "Disponível no nível X"; impedir início.

**Aceite.** Missão de nível superior aparece bloqueada e o `start` é recusado com mensagem clara.

---

### RF-MIS-06 🟡 Detalhe completo da missão

**Estado atual.** `mission/[id]` existe; falta exibir prazo (`start_date`/`end_date`), tipo de evidência (`verification_type`), regras de recorrência e limites.

**Frontend.** Seções: objetivo, passos, **pontos**, prazo/validade, "como comprovar" (auto/foto/aprovação/GPS), recorrência e limites diários.

**Aceite.** Detalhe informa exatamente o que fazer, quanto vale e como comprovar.

---

### RF-MIS-08 🟡 Submissão com evidência

**Estado atual.** `POST /missions/{id}/submit` aceita `evidence_url`/`notes`; UI envia `evidence_url` simples.

**Frontend.** Formulário condicional ao `verification_type`: `auto` (sem evidência), `photo` (upload — RF-MIS-09), `gps` (capturar localização), `admin_approval` (texto/foto + aviso de revisão). Enviar e refletir o novo `status` retornado.

**Aceite.** Cada tipo de missão coleta a evidência adequada e o estado muda conforme a resposta.

---

### RF-MIS-09 🔴 Upload de imagem como evidência

**Estado atual.** Não há upload; falta *storage* e endpoint de *upload*.

**Backend.** Endpoint `POST /uploads/evidence` que retorna URL assinada do Supabase Storage (bucket `evidences`, privado) ou aceita *multipart* e grava no *storage*; devolver `url` pública/assinada para passar em `evidence_url`. Validar *mime* e tamanho.

**Frontend.** `expo-image-picker` (adicionar dependência) para câmera/galeria; pré-visualização; barra de progresso; em falha, permitir reenvio. Passar a URL no `submit`.

**Dependências.** `expo-image-picker`; bucket no Supabase Storage com políticas; CDN.

**Aceite.** Usuário anexa foto, vê preview e progresso; a missão é submetida com a URL; imagem fica acessível ao moderador.

---

### RF-MIS-10 🟡 Missão de compartilhamento integrada à biblioteca

**Estado atual.** Existe `POST /content/{id}/share`; falta amarrar a conclusão da missão ao compartilhamento.

**Backend.** Quando `action_type` da missão é `content_share`, a chamada de `share` deve registrar evidência/atividade e (se houver `UserMission` em andamento) acionar `submit`/`award_points` idempotente.

**Frontend.** Na missão de compartilhar, CTA leva à biblioteca (ou item específico); após `Share` nativo + `shareContent`, retornar e refletir conclusão.

**Aceite.** Compartilhar pelo fluxo conclui a missão de compartilhamento e credita pontos uma única vez.

---

### RF-MIS-11 🔴 Missão de convite vinculada a convidados validados

**Backend.** Para `action_type='invite'`, o critério de conclusão é "N convidados com `invitation.status='validated'`". Avaliar no `submit` ou via gatilho ao validar convite (RF-INV-05): quando o usuário atinge N, concluir a `UserMission` e pontuar (idempotente por `user+mission`).

**Frontend.** No detalhe da missão de convite, mostrar progresso "X de N convidados ativos" e CTA para a tela Convidar.

**Aceite.** Ao atingir N convidados validados, a missão conclui automaticamente e pontua; progresso visível.

---

### RF-MIS-12 🔴 Idempotência ponta a ponta na concessão de pontos

**Estado atual.** O `GamificationEngine.award_points` **já** é idempotente (chave única). Falta garantir que **todo** caminho de pontuação passe por ele com `idempotency_key` determinístico (não `uuid4()` aleatório no *fallback*).

**Backend.** Auditar chamadas de `award_points` em missões, eventos, conteúdo e convites; padronizar a chave: `f"{user_id}:{source_type}:{source_id}:{user_mission_or_occurrence_id}"`. Garantir transação única (ledger + snapshot) com *rollback* em erro. Cobrir com teste que reenvia a mesma submissão e verifica saldo inalterado.

**Aceite.** Reenviar a mesma submissão/check-in/compartilhamento **não** duplica pontos; teste automatizado comprova.

---

### RF-MIS-13 🔴 Estado "em revisão" e notificação do resultado

**Estado atual.** Admin já aprova/rejeita (`/admin/missions/{id}/verify`) e o engine pontua na aprovação. Falta o lado do participante: ver "em revisão" e ser **notificado** do resultado.

**Backend.** Ao aprovar/rejeitar, criar `Notification` para o usuário (tipo `mission`) com resultado e motivo (se rejeitado). (Verificar se já é criado; senão, adicionar.)

**Frontend.** Estado "em revisão" no detalhe e na lista; ao receber notificação (push/central), refletir conclusão/rejeição; rejeição mostra motivo e permite renovar tentativa se dentro do limite.

**Aceite.** Submissão que exige aprovação aparece "em revisão"; quando o admin decide, o usuário recebe notificação e o estado atualiza.

---

### RF-MIS-14 🔴 Recorrência e *cooldown*

**Estado atual.** O `MissionService.start_mission` **já** implementa ONE_TIME/DAILY/WEEKLY e *rate limit* diário. Falta `PER_EVENT` e refletir o *cooldown* na UI.

**Backend.** Implementar `PER_EVENT` (permitir nova tentativa por evento associado). Expor no `MissionResponse`/`UserMissionResponse` o "disponível novamente em" quando em *cooldown*.

**Frontend.** Mostrar "disponível novamente em {tempo}" e desabilitar início durante o *cooldown*.

**Aceite.** Missão diária não pode ser refeita no mesmo dia (mensagem clara); semanal idem na semana; por evento respeita o vínculo; UI mostra contagem.

---

### RF-MIS-15 🔴 Feedback imediato ao concluir

Coberto por **RF-HOME-08** (RewardOverlay) acionado também no detalhe da missão. **Aceite:** concluir missão exibe ganho de pontos e eventual badge/nível.

---

## Seção 4 — Gamificação: pontos, ranking, conquistas

### RF-GAM-01 🟡 Saldo a partir do ledger

**Estado atual.** Engine mantém `total_points` materializado e tem `reconcile_points`. Falta agendar a reconciliação periódica.

**Backend.** Tarefa agendada (Celery beat) para `reconcile_points` por lote; alerta se divergência. Documentar fonte de verdade (ledger) vs. snapshot.

**Aceite.** Saldo exibido = soma do ledger; reconciliação periódica corrige eventuais divergências e registra log.

---

### RF-GAM-02 🟡 Nível atual, próximo e regra de desbloqueio

**Estado atual.** `UserStats` traz nível atual/próximo e pontos faltantes; falta mostrar **critérios não-pontuais** (missões distintas, convidados ativos) e o estado `level_pending_approval`.

**Frontend.** No perfil/Home, além de pontos, listar critérios pendentes do próximo nível (ex.: "conclua 3 missões distintas", "5 convidados ativos") com seu progresso. Mostrar "aguardando aprovação" quando aplicável.

**Aceite.** Usuário entende exatamente o que falta (pontos **e** critérios) para subir de nível.

---

### RF-GAM-03 🔴 Limiares parametrizados vindos do backend

**Estado atual.** `levels` tem `min_points`, `min_missions_completed`, `min_referrals_active`, `requires_approval` no banco e o engine os usa. Falta o app **ler** esses parâmetros (`GET /users/levels/all`) em vez de assumir defaults no cliente.

**Frontend.** Carregar níveis via `getLevels()` e usar seus limiares para textos de progresso (não *hardcode*). Cachear.

**Aceite.** Alterar um limiar no banco reflete nos textos do app sem mudar código.

---

### RF-GAM-04 🔴 Celebrar e propagar subida de nível

**Estado atual.** Engine detecta *level up* e cria notificação ao admin para níveis com aprovação. Falta: notificar **o usuário** ao subir de nível automático e atualizar `current_level` em todas as telas.

**Backend.** No `_check_level_up`, ao promover nível **sem** aprovação, atualizar `profiles.current_level_id`, registrar evento auditável e criar `Notification` (tipo `level_up`) ao usuário.

**Frontend.** Ao detectar `level_up` no retorno de `award_points` (via store) ou ao receber a notificação, exibir RewardOverlay e atualizar `authStore.user.current_level` (chamar `refreshProfile`).

**Aceite.** Ao cruzar o limiar de um nível automático, o usuário é promovido, notificado e vê o novo nível imediatamente em todo o app.

---

### RF-GAM-05 🔴 Estado "aguardando aprovação" (níveis 4/5)

**Estado atual.** Engine seta `profiles.level_pending_approval=true` e notifica admin. Falta a UI do participante e o caminho de aprovação no painel (ver RF-ADM-06).

**Frontend.** Banner "Você atingiu os requisitos do nível {X} — aguardando aprovação da campanha"; ao aprovar (admin), notificação + atualização de nível.

**Aceite.** Usuário elegível a nível 4/5 vê o estado pendente; após aprovação, é promovido e notificado.

---

### RF-GAM-06/07/08 🟡 Leaderboard, filtros e "minha posição"

**Estado atual.** `ranking.tsx` já mostra pódio e banner "minha posição" (`getMyRank`). **Mas** o filtro de período (Semanal/Mensal/Geral) **não tem efeito** (o endpoint não recebe período) e o filtro **regional** não é exposto na UI (o backend aceita `region_id`).

**Backend.** Adicionar suporte a período em `GET /gamification/leaderboard?period=weekly|monthly|all` (somar `point_transactions` no intervalo) e manter `region_id`. `get_user_rank` deve aceitar os mesmos filtros para a posição fora do top-N ser coerente.

**Frontend.** Ligar os botões de período à query; adicionar seletor de região (de `getRegions`). Recarregar lista e banner com os filtros ativos.

**Aceite.** Trocar período/registro muda a lista **e** a "minha posição"; empate é resolvido por data de atingimento (ver RF-GAM-10).

---

### RF-GAM-09 🔴 Respeitar opt-in de exposição pública no ranking

**Estado atual.** O leaderboard expõe `full_name` de todos. PRD §8 exige que quem **não** consentiu exposição pública apareça anonimizado.

**Backend.** No `get_leaderboard`, se o `Profile` não tem consentimento `public_ranking` ativo, retornar `full_name = "Participante anônimo"` (ou iniciais) e `avatar_url = null`. A posição continua contando; só a identidade é ocultada.

**Frontend.** Renderizar anônimos sem foto/nome real; o próprio usuário sempre se vê.

**Aceite.** Usuário sem consentimento de exposição não é identificável no ranking de terceiros; ainda assim ocupa sua posição.

---

### RF-GAM-10 🔴 Ranking de baixa latência (Redis) e desempate

**Estado atual.** Leaderboard é **PostgreSQL puro** (`ORDER BY total_points`). PRD pede Redis Sorted Sets (< 100ms) e desempate por data de atingimento.

**Backend.**
- Provisionar Redis (já previsto na stack).
- Manter *sorted set* por escopo: `lb:global`, `lb:region:{id}`, `lb:period:{weekly|monthly}`. *Score* = pontos; desempate por data (técnica: *score* composto `pontos - (timestamp/1e13)` ou ZSET secundário por tempo).
- Atualizar o ZSET dentro de `award_points` (após o ledger). Recalcular janelas de período via tarefa agendada.
- Endpoints de leaderboard leem do Redis; PostgreSQL permanece fonte de verdade (reconstrução do ZSET sob demanda).

**Aceite.** Leaderboard responde < 100ms sob carga; empate ordena quem atingiu a pontuação primeiro; queda do Redis se recupera reconstruindo do Postgres.

---

### RF-GAM-11 🔴 Galeria de conquistas (badges)

**Estado atual.** `UserStats.badges` retorna badges do usuário; `BadgeResponse` existe. Falta **tela** de galeria (conquistados x bloqueados) e o catálogo completo.

**Backend.** `GET /gamification/badges` (catálogo completo, com critério legível) e `GET /gamification/my-badges` (já há dados em `my-stats`; opcionalmente endpoint dedicado com `seen`). `PATCH /gamification/badges/{id}/seen` para marcar visto.

**Frontend.** Tela `achievements/index.tsx`: grade de badges; conquistados coloridos (com data), bloqueados em *grayscale* com critério ("Convide 1 pessoa"). Marcar como vistos ao abrir.

**Aceite.** Usuário vê todos os badges, quais possui e o que falta para os demais.

---

### RF-GAM-12 🔴 Concessão de badges por marcos

**Estado atual.** O engine chama `_check_badge_criteria` após pontuar, mas o **catálogo de critérios** e sua avaliação precisam estar completos e configuráveis.

**Backend.** Definir critérios no `badges` (campo `criteria` JSONB: ex. `{type:'invites', count:1}`, `{type:'events', count:10}`, `{type:'mission_type', action:'training', count:1}`). Implementar avaliadores em `_check_badge_criteria`; conceder via `UserBadge` (idempotente — não conceder duas vezes) e criar `Notification` (tipo `badge`).

**Aceite.** Ao cumprir um marco (1º convite, 10 eventos, 1ª formação), o badge é concedido uma única vez e o usuário é notificado.

---

### RF-GAM-13 🔴 Certificados digitais (PDF)

**Estado atual.** Não implementado.

**Backend.** Serviço de geração de PDF (ex.: `weasyprint`/`reportlab`) acionado por evento (conclusão de formação / atingir nível). Template com nome, conquista, data, identidade visual. Armazenar em Storage (`certificates`) + CDN; registrar em tabela `certificates(user_id, type, ref_id, url, issued_at)`. Endpoint `GET /gamification/certificates` e `GET /gamification/certificates/{id}` (URL assinada).

**Frontend.** Em conquistas/perfil, listar certificados com **baixar/compartilhar** (`expo-sharing`/`Linking`).

**Dependências.** Lib de PDF; bucket `certificates`; fonte/identidade.

**Aceite.** Ao concluir uma formação/atingir nível elegível, um certificado em PDF é gerado, fica disponível para download/compartilhamento e persiste entre sessões.

---

### RF-GAM-14 🔴 Notificar conquista desbloqueada

Coberto por RF-GAM-12 (cria `Notification`) + RF-NOT-05 (push). **Aceite:** badge novo gera notificação na central e push (se permitido).

---

### RF-GAM-15/16/17 🔴 Histórico de atividades (ledger transparente)

**Estado atual.** `GET /gamification/points-history` retorna o ledger; **não há tela**.

**Frontend.** Tela `activity/history.tsx`: *timeline* paginada (usar `limit`/`offset`), cada item com origem (`source_type`: missão/evento/convite/ajuste), descrição, data e **+/− pontos**. Filtro por tipo/período. Tocar no item navega à missão/evento de origem (via `source_id`/`reference_id`). Estados de carregando/vazio/erro.

**Aceite.** Usuário audita cada ponto recebido, com origem rastreável e navegação ao item; paginação funciona.

---

## Seção 5 — Eventos

### RF-EVT-01/02/03 🟡 Agenda, filtros e detalhe

**Estado atual.** `getEvents(page, eventType, regionId)` e `getEvent(id)` existem; `event/[id]` exibe detalhe. Falta UI de filtros (tipo/região), mapa do local e estados de lista.

**Frontend.** Lista com filtros (tipo via chips; região via seletor); cartão com data/hora, local, tipo, pontos. Detalhe com mapa (coordenadas `latitude`/`longitude` — usar mapa nativo ou *deep link* para Maps), capacidade (`max_capacity`/`participants_count`) e janela de check-in (`checkin_start`/`checkin_end`).

**Aceite.** Filtrar muda a lista; detalhe mostra local no mapa, vagas e janela de check-in.

---

### RF-EVT-05 🟡 Check-in (código + GPS)

**Estado atual.** `event/[id]` **já** abre modal de check-in, pede localização (`expo-location`) e chama `checkinEvent({code, lat, lng})`; backend valida. Falta validar **janela temporal** na UI e tratar erros específicos (código inválido, fora do horário, fora do raio).

**Frontend.** Antes de abrir o modal, checar se está dentro de `checkin_start/end`; mensagens de erro específicas do backend (código incorreto, janela fechada, distância excedida). Em sucesso, RewardOverlay (RF-HOME-08).

**Backend.** Garantir que `EventService.checkin` valide: código correto, dentro da janela, e (se `verification_type=gps`) dentro de um raio configurável; pontuar via engine **idempotente** por `user+event`.

**Aceite.** Check-in só é aceito com código válido, dentro da janela e (quando exigido) dentro do raio; pontua uma vez; erros são claros.

---

### RF-EVT-06 🟡 Pontos por participação

**Estado atual.** `CheckinResult.gamification` já traz `points_awarded`. Garantir idempotência (RF-MIS-12) e reflexo no histórico/saldo.

**Aceite.** Check-in credita os pontos do evento uma única vez; aparecem no histórico.

---

### RF-EVT-07 🔴 Cancelar inscrição

**Backend.** `DELETE /events/{id}/register` (ou `POST /events/{id}/cancel`): remover participação, decrementar `participants_count`, liberar vaga. Bloquear cancelamento após check-in.

**Frontend.** Botão "Cancelar inscrição" no detalhe quando inscrito; confirmar; atualizar contagem.

**Aceite.** Cancelar remove a inscrição, libera vaga e atualiza a contagem; não é possível cancelar após check-in.

---

### RF-EVT-08 🔴 Lembrete (push) antes do evento

**Backend.** Tarefa agendada que, X horas antes do `start_datetime`, envia push aos inscritos (respeitando consentimento de comunicação). Requer push (RF-NOT-05) e tabela de inscritos.

**Frontend.** (Opcional) também agendar notificação local via `expo-notifications` ao se inscrever, como reforço.

**Aceite.** Inscritos recebem lembrete no intervalo configurado; quem revogou comunicação não recebe.

---

### RF-EVT-09 🔴 Adicionar ao calendário do dispositivo

**Frontend.** `expo-calendar` (adicionar dependência) para criar evento no calendário a partir do detalhe (com permissão).

**Aceite.** "Adicionar ao calendário" cria o evento com data/local corretos.

---

### RF-EVT-10 🔴 Eventos exclusivos por nível

**Backend.** Campo de nível mínimo no evento (ex.: `min_level_id`); `register` recusa abaixo do nível. Expor `locked` no `EventResponse`.

**Frontend.** Eventos exclusivos com cadeado e "Disponível no nível X"; bloquear inscrição.

**Aceite.** Evento exclusivo não aceita inscrição de quem não tem o nível; UI deixa claro.

---

### RF-EVT-11 🔴 Estados de lista (eventos)

Aplicar **BLK-02**. **Aceite** conforme BLK-02.

---

## Seção 6 — Biblioteca de materiais

### RF-LIB-01/02/03 🟡 Lista, filtros e detalhe

**Estado atual.** `getContent(page, contentType)` e `getContentById` existem; telas `content/index` e `content/[id]` existem. Faltam filtros por tipo, *thumbnails* e estados de lista.

**Frontend.** Grade/listas com `thumbnail_url`, filtro por `content_type` (imagem/vídeo/texto/link); detalhe com pré-visualização adequada ao tipo (player para vídeo, viewer para imagem, *render* de texto, *preview* de link).

**Aceite.** Filtra por tipo; detalhe pré-visualiza conforme o tipo; estados tratados.

---

### RF-LIB-04/05 🟡 Compartilhar e pontuar

**Estado atual.** `shareContent(id, platform)` existe e `ShareResult` traz `points_awarded`/`daily_shares_remaining`. Falta usar o **Share nativo** e refletir pontos/limite.

**Frontend.** Usar `Share.share()` do React Native com `share_text` + `content_url`; após compartilhar, chamar `shareContent` e mostrar pontos (RewardOverlay) e "compartilhamentos restantes hoje". Integrar com missão de compartilhamento (RF-MIS-10).

**Backend.** Garantir idempotência/limite diário no `share` (não pontuar acima de `daily_shares_remaining`).

**Aceite.** Compartilhar abre o seletor nativo, credita pontos dentro do limite diário e mostra o restante.

---

### RF-LIB-06 🔴 Cache offline da biblioteca

**Estado atual.** Sem cache; público em conexão limitada (premissa do PRD).

**Frontend.** Cachear metadados (lista/detalhe) com TTL (ex.: persistir via `AsyncStorage` ou `expo-file-system` para mídia já aberta). Mostrar conteúdo cacheado quando offline, com selo "offline". Baixar sob demanda ("salvar para offline").

**Aceite.** Materiais já abertos ficam acessíveis sem conexão; lista mostra última versão cacheada com indicação de offline.

---

### RF-LIB-07 🔴 Estados de lista (biblioteca)

Aplicar **BLK-02**. **Aceite** conforme BLK-02.

---

### RF-LIB-08 🔴 Materiais restritos por nível

**Backend.** Campo de nível mínimo no conteúdo; filtrar no `GET /content` conforme nível do usuário ou expor `locked`.

**Frontend.** Conteúdo de lideranças aparece bloqueado abaixo do nível.

**Aceite.** Material restrito não abre/abaixa para quem não tem nível; indicação clara.

---

## Seção 7 — Convidar voluntários

> Atenção LGPD/TSE: coleta de dado de terceiro e disparo a não usuários exigem **revisão jurídica** antes de habilitar envio direto (e-mail/SMS).

### RF-INV-01 🟡 Código/link de indicação

**Estado atual.** `generateReferralCode()` (`POST /users/me/referral-code`) existe. Falta exibir/compartilhar e *deep link*.

**Frontend.** Mostrar o código e um link `https://embaixadores.app/convite/{code}` (+ *deep link* `embaixadores://convite/{code}`). Botão de compartilhar (Share nativo).

**Aceite.** Usuário obtém e compartilha seu link/código; abrir o link encaminha ao cadastro com o código.

---

### RF-INV-02 🟡 Criar convite rastreável + deep link

**Estado atual.** `createInvitation(data)` (`POST /invitations`) existe. Falta o *deep linking* (`expo-linking`) que abre o cadastro com o código pré-preenchido.

**Frontend.** Configurar esquema/host em `app.config`; *handler* de *deep link* que lê `code` e navega a `register` pré-preenchendo `referral_code` (liga com RF-AUTH-13).

**Aceite.** Tocar no link de convite abre o app (ou a *store*) e leva ao cadastro com o código aplicado.

---

### RF-INV-03 🔴 Tela "Convidar" com funil

**Estado atual.** `getMyInvitations()` (`/invitations/my`) existe; **não há tela**.

**Frontend.** Tela `invite/index.tsx`: bloco de compartilhamento (código/link), métrica de impacto ("X convidados, Y ativos") e **lista de convidados** com status (enviado/cadastrado/validado), de `InviteTracking`. Estados de carregando/vazio/erro.

**Aceite.** Usuário vê seus convidados e o status de cada um; compartilha dali.

---

### RF-INV-04 🔴 Aplicar código no cadastro e vincular convite

Coberto no **RF-AUTH-13** (backend) + **RF-INV-02** (deep link). **Aceite:** cadastro com código marca a `invitation` como `registered` e grava `referred_by`.

---

### RF-INV-05 🟡 Validar convite na ativação

**Estado atual.** `validateInvitation(code)` (`POST /invitations/{code}/validate`) existe. Falta **disparar** a validação no momento certo (quando o convidado "ativa": verifica contato + conclui 1ª missão, conforme métrica de ativação do PRD).

**Backend.** Ao concluir a ativação do convidado (verificação + 1ª missão), marcar `invitation.status='validated'`, creditar pontos ao convidador (idempotente) e avaliar missão de convite (RF-MIS-11) e badges (RF-GAM-12).

**Aceite.** Quando o convidado ativa, o convite vira `validated` e o convidador é creditado uma única vez.

---

### RF-INV-06 🔴 Pontos por convidado validado + critério de nível

Coberto por RF-INV-05 + engine (`min_referrals_active` já lido no *level up*). **Aceite:** convidados validados contam para nível e pontuam o convidador.

---

### RF-INV-07 🔴 Conformidade de dados de terceiros

**Backend/Produto.** Se o convite coletar e-mail/telefone do convidado, registrar base legal e oferecer *opt-out*; **não** disparar mensagens em massa sem revisão jurídica. Marcar no código `// LEGAL-REVIEW`. Preferir, no MVP, **convite por link compartilhado pelo próprio usuário** (sem o app armazenar contato de terceiro).

**Aceite.** Não há disparo a terceiros sem base legal; convite por link não armazena dado de não usuário.

---

### RF-INV-08 🔴 Acompanhar funil

Coberto por RF-INV-03 (estados enviado/cadastrado/validado). **Aceite:** funil visível e coerente com o backend.

---

## Seção 8 — Notificações

### RF-NOT-03 🟡 Pull-to-refresh e estado vazio

**Estado atual.** Central existe com tipos; falta `EmptyState` e refinar *refresh*.

**Frontend.** `EmptyState` ("Sem notificações"); manter *pull-to-refresh*.

**Aceite.** Sem notificações, aparece estado vazio; *refresh* recarrega.

---

### RF-NOT-04 🔴 Registrar token de push

**Estado atual.** Sem push.

**Backend.** `POST /notifications/device-token` (body `{ token, platform }`) salvando em `device_tokens(user_id, token, platform, updated_at)`; usado pelo *sender*.

**Frontend.** `expo-notifications` (adicionar dependência): solicitar permissão no momento adequado (após primeira interação relevante, não no *cold start*), obter *Expo push token* e registrar. Reenviar ao mudar.

**Dependências.** `expo-notifications`; credenciais FCM (Android) e APNs (iOS) no projeto Expo/EAS.

**Aceite.** Após permissão, o token é registrado no backend e atualizado quando muda.

---

### RF-NOT-05 🔴 Receber push (primeiro/segundo plano)

**Backend.** *Sender* via Expo Push API (ou FCM direto) acionado por: nova missão/evento, resultado de revisão, *level up*, badge, campanha segmentada (RF-ADM-14). Respeitar consentimento de comunicação. Processar via Celery/fila.

**Frontend.** *Listeners* de `expo-notifications` para *foreground* (mostrar *in-app*) e toque (deep link — RF-NOT-06); sincronizar com a central (marca como recebida).

**Aceite.** Mensagem chega em *foreground* e *background*; aparece também na central.

---

### RF-NOT-06 🔴 Deep link ao tocar a notificação

**Frontend.** *Payload* da notificação inclui `target` (ex.: `mission:{id}`, `event:{id}`, `achievement`). O *handler* navega à tela correta. Tratar app fechado (cold start via *initial notification*).

**Aceite.** Tocar abre exatamente a tela do conteúdo, mesmo com o app fechado.

---

### RF-NOT-07 🔴 Opt-out por categoria

**Backend.** Preferências por categoria (missões, eventos, ranking, campanha) em `notification_preferences(user_id, category, push, email)`; *sender* respeita.

**Frontend.** Tela de preferências de notificação (em Configurações) com *toggles* por categoria.

**Aceite.** Desativar uma categoria interrompe push/e-mail daquela categoria; o de transação essencial (ex.: segurança) permanece.

---

## Seção 9 — Perfil e LGPD

### RF-PERF-01/02 🟡 Dados, nível e resumo de conquistas

**Estado atual.** `profile.tsx` mostra usuário/nível e consome `my-stats`. Falta barra de progresso completa (RF-GAM-02) e atalho para galeria (RF-GAM-11).

**Frontend.** Bloco de identidade + nível + barra; resumo de badges com "ver todos" → `achievements`.

**Aceite.** Perfil mostra progresso real e leva à galeria de conquistas.

---

### RF-PERF-03 🔴 Editar perfil

**Estado atual.** `updateProfile` (`PATCH /users/me`) existe; **sem tela**.

**Frontend.** `profile/edit.tsx`: editar nome, telefone (máscara/validação), cidade/estado (de `getRegions`); salvar com feedback; refletir no `authStore`.

**Aceite.** Edição persiste no backend e atualiza o app imediatamente.

---

### RF-PERF-04 🔴 Foto de perfil (upload)

**Backend.** Reusar *upload* (RF-MIS-09) com bucket `avatars` (público); gravar `profiles.avatar_url`.

**Frontend.** `expo-image-picker` para escolher/recortar; preview; progresso; atualizar `avatar_url`.

**Aceite.** Foto enviada aparece no perfil, ranking e onde houver avatar; persiste.

---

### RF-PERF-05 🟡 Configurações organizadas

**Frontend.** Tela/seção de Configurações: Notificações (RF-NOT-07), Privacidade/LGPD (RF-LGPD-01), Termos/Política (RF-AUTH-15), Sair, Excluir conta.

**Aceite.** Todas as configurações acessíveis a partir de um ponto coerente.

---

### RF-PERF-06 🔴 Região e célula/equipe

**Frontend.** Exibir região do usuário (de `region_id`) e célula/equipe quando aplicável (níveis ≥ 3). Requer expor `team`/`cell` no perfil (backend).

**Aceite.** Perfil mostra região e, para lideranças, a célula/equipe.

---

### RF-PERF-07 🟡 Logout

**Estado atual.** `profile` já chama `logout` com confirmação. Garantir limpeza total (token no `ApiService`, *stores*) e retorno ao login.

**Aceite.** Logout limpa sessão e leva ao login; nenhuma chamada autenticada subsequente funciona até novo login.

---

### RF-LGPD-01 🔴 Tela de consentimentos

**Estado atual.** `authStore.loadConsents/toggleConsent` e endpoints existem; `profile` lê `consents`. Falta **tela dedicada** com data/versão e efeito de cada consentimento.

**Frontend.** `profile/privacy.tsx`: lista de consentimentos (tratamento — informado como base do uso; comunicação; exposição pública) com *toggle*, data e versão (de `Consent`). Texto explicando o efeito (ex.: desligar exposição remove o nome do ranking — RF-GAM-09).

**Aceite.** Usuário vê e altera cada consentimento; mudanças refletem no comportamento (ranking/comunicação) e ficam registradas com versão/data.

---

### RF-LGPD-02 🟡 Conceder/revogar comunicação e exposição

Coberto por RF-LGPD-01 (UI) + endpoints existentes. **Aceite:** revogar comunicação interrompe disparos (RF-NOT-07); revogar exposição anonimiza no ranking (RF-GAM-09).

---

### RF-LGPD-03 🔴 Exportar/portar dados

**Backend.** `GET /users/me/export` que gera um pacote (JSON/CSV) com dados do titular (perfil, consentimentos, histórico de pontos, missões, eventos) — assíncrono se grande, com link de download.

**Frontend.** Botão "Baixar meus dados" em Privacidade; ao concluir, oferecer download/compartilhamento.

**Aceite.** Usuário solicita e recebe um arquivo com seus dados pessoais.

---

### RF-LGPD-04 🟡 Excluir conta com anonimização

**Estado atual.** `deleteAccount` (`DELETE /users/me/account`) existe; `profile` tem confirmação dupla. Garantir no backend a **anonimização** (não *hard delete* que quebre agregados): limpar PII (`full_name`, `email`, `phone`, `avatar_url`), manter ledger anonimizado para integridade de rankings/relatórios; invalidar sessão.

**Backend.** Implementar/validar rotina de anonimização (substituir PII por *placeholders*, desvincular `referred_by` se exigido), registrar evento; revogar tokens no Supabase.

**Aceite.** Após exclusão, a PII some, o usuário não loga mais, e os agregados/rankings históricos permanecem consistentes (anônimos).

---

### RF-LGPD-05 🔴 Política e contato do DPO no app

**Frontend.** Em Privacidade, link para a Política (RF-AUTH-15) e contato do encarregado (DPO) — e-mail/canal.

**Aceite.** Usuário acessa Política e contato do DPO dentro do app.

---

### RF-LGPD-06 🔴 Refletir revogação de exposição no ranking

Coberto por RF-GAM-09. **Aceite:** ao revogar, o nome deixa de aparecer para terceiros imediatamente (ou no próximo carregamento).

---

## Seção 10 — Painel da Campanha (Web · Next.js)

> **Estado atual.** O **backend admin existe e é robusto** (RBAC com papéis, auditoria, verificação de missões, fila de moderação com detecção de anomalias, CRUD de missões/eventos/conteúdo, envio de notificações segmentadas). **Não há frontend web** (`/web`). Todos os itens abaixo são 🔴 **A Implementar** no frontend, consumindo endpoints já existentes em `/api/v1/admin`.

**Fundação web (criar uma vez).** Projeto Next.js em `/web`: autenticação (Supabase) com leitura do papel/claims; *layout* com navegação por módulo; cliente HTTP com *bearer* + tratamento 401; tabelas com busca/ordenação/paginação; componentes de gráfico (séries temporais/distribuição); *guards* por papel.

### RF-ADM-01/02/03 🔴 Login, RBAC e auditoria (web)

**Frontend.** Login admin; ler papel (`SUPER_ADMIN`/`CAMPAIGN_MANAGER`/`REGIONAL_COORDINATOR`/`MODERATOR`/`ANALYST`); ocultar/lockar módulos e dados conforme papel (coordenador regional restrito à sua região). Página de **Auditoria** consumindo `audit_logs` (já gravados pelo backend via `log_audit`).

**Aceite.** Cada papel vê apenas o permitido; ações sensíveis aparecem na auditoria com autor/data.

---

### RF-ADM-04/05/06/07 🔴 Gestão de voluntários

**Frontend.** Lista com busca/filtros (nome, região, nível, atividade, status); perfil do voluntário (pontos, histórico — `points-history`, convidados, eventos); **aprovar/recusar** níveis 4/5 (consumir endpoint de aprovação que consome o estado `level_pending_approval`); suspender/reativar (`suspend_user`) com motivo.

**Backend (verificar/criar).** Endpoint de **aprovação de nível** que, ao aprovar, define `current_level_id`, zera `level_pending_approval`, registra auditoria e **notifica o usuário** (liga com RF-GAM-05).

**Aceite.** Gestor encontra um voluntário, vê seu perfil, aprova/recusa promoção e suspende/reativa; participante é notificado da decisão.

---

### RF-ADM-08/09/10 🔴 Métricas e engajamento

**Frontend.** Dashboard: WAU/MAU, ativação (cadastro→1ª missão ≤ 48h), retenção D7/D30, **missões concluídas por usuário ativo** (North Star), funil de níveis, coeficiente viral (convites→validados). Filtros por período e território; visualizações claras.

**Backend (verificar/criar).** Endpoints de métricas agregadas (ou *views*/materializações) por período/região. Onde não existir, criar `GET /admin/metrics/*`.

**Aceite.** Indicadores carregam por período/região e batem com os dados operacionais.

---

### RF-ADM-11/12/13 🔴 Gestão de missões e eventos

**Frontend.** CRUD de **missões** (consome `POST/PATCH /admin/missions`): tipo/ação, pontos, recorrência, validação (`auto/photo/admin_approval/gps`), nível mínimo, limites diários, ativação, destaque. CRUD de **eventos** (`/admin/events*`): dados, capacidade, **código de check-in** e **regenerar código** (`/regenerate-code`), nível mínimo (RF-EVT-10). Definir exclusividade por nível.

**Aceite.** Gestor cria/edita missões e eventos; eles aparecem para os participantes elegíveis; código de check-in pode ser regenerado.

---

### RF-ADM-14/15/16 🔴 Comunicação segmentada

**Frontend.** Compositor de campanha (consome `POST /admin/notifications/send`): segmentar por **região**, **nível** e atividade; *preview*; envio. **Opt-out obrigatório** e respeito a consentimento (RF-NOT-07). Tela de histórico de envios (logs) para prestação de contas.

**Backend (verificar/criar).** Garantir que o *sender* respeite consentimento/opt-out e registre log de comunicação (TSE). Marcar `// LEGAL-REVIEW`.

**Aceite.** Campanha atinge apenas o segmento e apenas quem consentiu; cada disparo tem *opt-out* e fica registrado.

---

### RF-ADM-17 🔴 Monitoramento de lideranças locais

**Frontend.** Visão por célula/região: nº de lideranças, saúde (atividade recente), desempenho (pontos/missões da célula). Restringir por papel regional.

**Aceite.** Coordenador vê a saúde das lideranças da sua área.

---

### RF-ADM-18 🔴 Relatórios por região e equipe (exportáveis)

**Frontend.** Relatórios com filtros temporais/territoriais e **exportação CSV/PDF**.

**Backend.** Endpoints de relatório/exportação (gerar CSV; PDF via serviço de RF-GAM-13).

**Aceite.** Relatório filtrado pode ser exportado em CSV e PDF com os números corretos.

---

### RF-ADM-19 🔴 Moderação / antifraude

**Estado atual (backend).** **Já existe** `GET /admin/moderation/queue` (missões pendentes + detecção de picos suspeitos) e `verify` (aprovar/rejeitar com motivo + auditoria + pontuação idempotente).

**Frontend.** Tela de fila: ver evidência (imagem), aprovar/rejeitar com motivo; sinalizar anomalias; ação em lote. Ao decidir, o participante é notificado (RF-MIS-13).

**Aceite.** Moderador processa a fila, vê evidências, aprova/rejeita com motivo; pontuação ocorre só na aprovação e sem duplicidade.

---

### RF-ADM-20 🔴 Auditoria e administração

**Frontend.** Página de auditoria (filtros por autor/ação/entidade/data) e gestão de papéis (atribuir/revogar). Consome `audit_logs` e endpoints de papéis.

**Aceite.** Toda ação administrativa é rastreável; papéis podem ser geridos por quem tem permissão.

---

## Seção 11 — Não-funcionais que impactam o uso

### RF-NF-01 🟡 Mobile-first
Garantir alvos ≥ 44×44, teclado correto por campo, telas autoexplicativas. **Aceite:** auditoria de toque/teclado nas telas principais passa.

### RF-NF-02 🟡 Acessibilidade
Contraste AA, leitor de tela, fontes escaláveis, cor não como único indicador. **Aceite:** auditoria de acessibilidade nas telas principais passa.

### RF-NF-03 🔴 Conexão limitada
Skeletons, cache (RF-LIB-06), UI otimista e *retry* (BLK-02). **Aceite:** app utilizável em 3G fraca; ações otimistas com reconciliação.

### RF-NF-04 🔴 Estados padronizados
Carregando/vazio/erro em todas as listas/detalhes (BLK-02). **Aceite:** nenhuma tela de dados sem os três estados.

### RF-NF-05 🟡 Escala (200k usuários / picos)
Autoescala (Cloud Run/ECS), Redis para ranking (RF-GAM-10), fila para tarefas pesadas. **Aceite:** teste de carga sustenta pico sem degradar leituras críticas.

### RF-NF-06 🔴 Desempenho (p95 < 300ms; ranking < 100ms)
Índices (BLK-01), Redis (RF-GAM-10), *caching*. **Aceite:** métricas de p95 atingidas em teste de carga.

### RF-NF-07 🔴 Idempotência
Cobrir todos os caminhos de pontuação (RF-MIS-12). **Aceite:** testes de reenvio não duplicam.

### RF-NF-08 🟡 Segurança
WAF, *rate limiting* (há `shared/rate_limiter`), criptografia em trânsito/repouso, segredos gerenciados, *storage* privado para evidências. **Aceite:** revisão de segurança aprovada; sem segredo em código.

### RF-NF-09 🔴 Observabilidade
Logs estruturados, métricas de negócio/infra, alertas (inclusive custo). **Aceite:** painel de saúde e alertas ativos.

### RF-NF-10 🟡 Hospedagem BR + retenção
Região brasileira (São Paulo); plano de retenção/expurgo pós-eleição. **Aceite:** dados em região BR; política de expurgo documentada e agendada.

### RF-NF-11 🟡 i18n
PT-BR base com estrutura para i18n (extrair *strings*). **Aceite:** *strings* centralizadas; troca de locale não quebra layout.

---

## Seção 12 — Sequência de execução recomendada (para "tudo funcionando")

A ordem maximiza a chance de cada fatia funcionar ponta a ponta:

1. **Bloqueadores (Seção 0):** BLK-01 (schema), BLK-02 (estados/erros), BLK-03 (refresh 401), BLK-04 (env). Sem isso, o resto "parece" pronto mas falha.
2. **Autenticação completa:** OTP (RF-AUTH-14), recuperação de senha (16–18), restauração de sessão (05), validações (03/04/11/12), código de indicação (13).
3. **Núcleo de missões e pontos:** estados de missão (RF-MIS-03/04/05/06), upload de evidência (09), idempotência (12), revisão+notificação (13), recorrência/cooldown na UI (14); histórico do ledger (RF-GAM-15).
4. **Gamificação visível:** progresso/critérios (RF-GAM-02/03), level up e celebração (04/05/RF-HOME-08), badges/galeria (11/12), notificações de conquista (14).
5. **Mobilização e crescimento:** eventos (cancelar 07, lembrete 08, calendário 09, exclusivos 10, estados 11), biblioteca (compartilhar 04/05, offline 06, estados 07), convites (tela 03, deep link 02, validação 05, conformidade 07).
6. **Push e preferências:** token (RF-NOT-04), recepção (05), deep link (06), opt-out (07); badges/contagem na home (RF-HOME-07).
7. **Perfil e LGPD:** editar (RF-PERF-03), foto (04), configurações (05); privacidade (RF-LGPD-01/03/05), exclusão/anonimização (04).
8. **Ranking de produção:** filtros período/região (RF-GAM-06/07/08), opt-in (09), Redis + desempate (10).
9. **Painel web:** fundação + RBAC/auditoria (RF-ADM-01/02/03), voluntários + aprovação de níveis (04–07), missões/eventos (11–13), moderação (19), métricas/relatórios (08–10/18), comunicação segmentada (14–16), lideranças (17), administração (20).
10. **Polimento e não-funcionais:** certificados (RF-GAM-13), observabilidade (RF-NF-09), desempenho/carga (RF-NF-06), acessibilidade/i18n, hardening (RF-NF-08).

---

## Seção 13 — Definition of Done (global)

Uma funcionalidade só está pronta quando:

- Atende à regra do PRD e aos critérios de aceite deste documento.
- Funciona **ponta a ponta** (frontend ↔ API ↔ banco ↔ integração), sem *fallback* silencioso.
- Possui estados de **carregando/vazio/erro** e feedback de ação.
- Tem **testes** nos fluxos críticos (incluindo **idempotência** onde há pontuação).
- Respeita **LGPD/TSE**, com pontos `// LEGAL-REVIEW` sinalizados e *opt-out* onde há comunicação.
- É **mobile-first** e **acessível** (AA, toque ≥ 44px, leitor de tela).
- Tem **observabilidade** (logs/métricas) e passou por revisão de **QA** e **segurança**.

---

## Anexo A — Dependências de frontend a adicionar

| Pacote | Para quê | Requisitos |
|---|---|---|
| `expo-image-picker` | Foto de evidência e avatar | RF-MIS-09, RF-PERF-04 |
| `expo-notifications` | Push e notificação local | RF-NOT-04/05/06, RF-EVT-08 |
| `expo-calendar` | Adicionar evento ao calendário | RF-EVT-09 |
| `expo-sharing` (ou `Share` nativo) | Compartilhar conteúdo/certificado | RF-LIB-04/05, RF-GAM-13 |
| `expo-file-system` | Cache de mídia offline | RF-LIB-06 |
| `expo-auth-session` | Login social | RF-AUTH-07 |
| Lib de mapa (`react-native-maps` ou *deep link* Maps) | Local do evento | RF-EVT-03 |

> `expo-location`, `expo-linking`, `expo-web-browser` **já** constam no `package.json`.

## Anexo B — Endpoints/serviços de backend a criar ou ajustar

| Item | Tipo | Requisito |
|---|---|---|
| `004_fix_missions_schema.sql` | Migration | BLK-01 |
| `POST /auth/social` | Novo | RF-AUTH-07 |
| `POST /auth/verify/send` · `/confirm` | Novo | RF-AUTH-14 |
| `POST /auth/password/forgot` · `/reset` | Novo | RF-AUTH-16/17 |
| Vínculo de `referral_code` no `register` | Ajuste | RF-AUTH-13 |
| `min_level` em missões/eventos/conteúdo + `locked` | Ajuste | RF-MIS-05, RF-EVT-10, RF-LIB-08 |
| `POST /uploads/evidence` (+ buckets `evidences`/`avatars`/`certificates`) | Novo | RF-MIS-09, RF-PERF-04, RF-GAM-13 |
| Notificação ao usuário em verify/level up/badge | Ajuste | RF-MIS-13, RF-GAM-04/12 |
| `leaderboard?period=` + Redis Sorted Sets | Ajuste/Novo | RF-GAM-06/10 |
| Anonimização no ranking por consentimento | Ajuste | RF-GAM-09 |
| `GET /gamification/badges` · `/my-badges` · `.../seen` | Novo | RF-GAM-11 |
| Geração de certificados (PDF) + `certificates` | Novo | RF-GAM-13 |
| `DELETE /events/{id}/register` (cancelar) | Novo | RF-EVT-07 |
| Lembrete de evento (Celery) | Novo | RF-EVT-08 |
| `POST /notifications/device-token` + `device_tokens` | Novo | RF-NOT-04 |
| *Sender* de push (Expo/FCM) via fila | Novo | RF-NOT-05 |
| `notification_preferences` + opt-out | Novo | RF-NOT-07 |
| `GET /users/me/export` | Novo | RF-LGPD-03 |
| Anonimização real em `DELETE /users/me/account` | Ajuste | RF-LGPD-04 |
| Endpoint de **aprovação de nível** (admin) | Novo/Ajuste | RF-ADM-06, RF-GAM-05 |
| Métricas agregadas (`/admin/metrics/*`) | Novo | RF-ADM-08/09/10 |
| Relatórios/exportação CSV-PDF | Novo | RF-ADM-18 |
| `reconcile_points` agendado (Celery beat) | Ajuste | RF-GAM-01 |

