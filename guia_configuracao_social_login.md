# Guia de Configuração — Login Social (Produção)

---

## 1. Google Cloud Console

### 1.1 Criar Projeto (se ainda não tem)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. No topo, clique no seletor de projetos → **Novo Projeto**
3. Nome: `Rede de Embaixadores` → **Criar**

### 1.2 Configurar Tela de Consentimento OAuth

1. Menu lateral → **APIs & Services** → **OAuth consent screen**
2. User Type: **External** → **Create**
3. Preencha:
   - App name: `Rede de Embaixadores`
   - User support email: seu email
   - Logo: (opcional)
   - Developer contact: seu email
4. **Scopes**: adicione `email` e `profile` → **Save**
5. **Test users**: adicione seu email para testes → **Save**
6. Em produção, clique em **Publish App** para sair do modo teste

### 1.3 Criar Credenciais OAuth — Web Client

> [!IMPORTANT]
> Este é o Client ID principal, usado pelo Supabase e como fallback no app.

1. Menu lateral → **APIs & Services** → **Credentials**
2. **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Nome: `Embaixadores Web`
5. **Authorized redirect URIs**: adicione:
   ```
   https://<SEU-PROJETO>.supabase.co/auth/v1/callback
   ```
   (Substitua `<SEU-PROJETO>` pela URL do seu Supabase)
6. **Create** → copie o **Client ID** e **Client Secret**

```bash
# Salve no .env do app:
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<client-id-do-web>.apps.googleusercontent.com
```

### 1.4 Criar Credenciais OAuth — iOS Client

1. **+ Create Credentials** → **OAuth client ID**
2. Application type: **iOS**
3. Nome: `Embaixadores iOS`
4. **Bundle ID**: `com.embaixadores.app`
5. **Create** → copie o **Client ID**

```bash
# Salve no .env do app:
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<client-id-ios>.apps.googleusercontent.com
```

### 1.5 Criar Credenciais OAuth — Android Client

1. **+ Create Credentials** → **OAuth client ID**
2. Application type: **Android**
3. Nome: `Embaixadores Android`
4. **Package name**: `com.embaixadores.app`
5. **SHA-1 certificate fingerprint**: obtenha com:
   ```bash
   # Para a keystore de debug:
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>&1 | grep SHA1

   # Para a keystore de produção (EAS Build):
   # Use o fingerprint fornecido pelo EAS no dashboard
   ```
6. **Create** → copie o **Client ID**

```bash
# Salve no .env do app:
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<client-id-android>.apps.googleusercontent.com
```

### Resumo dos Client IDs

| Tipo | Onde usar | Env var |
|------|-----------|---------|
| Web | Supabase Dashboard + app (fallback) | `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| iOS | App no iOS | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Android | App no Android | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |

---

## 2. Apple Developer Portal

### 2.1 Habilitar Sign In with Apple no App ID

1. Acesse [developer.apple.com/account](https://developer.apple.com/account)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Encontre (ou crie) o App ID com Bundle ID: `com.embaixadores.app`
4. Clique nele → na lista de **Capabilities**, marque ✅ **Sign In with Apple**
5. **Save**

### 2.2 Criar Service ID (necessário para o Supabase)

> [!IMPORTANT]
> O Supabase precisa de um **Service ID** separado para validar tokens Apple no servidor.

1. Em **Identifiers** → clique no **+** → selecione **Services IDs** → **Continue**
2. Preencha:
   - Description: `Rede de Embaixadores Web`
   - Identifier: `com.embaixadores.app.service` (diferente do App ID!)
3. **Register** → clique no Service ID recém-criado
4. Marque ✅ **Sign In with Apple** → clique em **Configure**
5. Configure:
   - **Primary App ID**: selecione `com.embaixadores.app`
   - **Domains**: `<SEU-PROJETO>.supabase.co`
   - **Return URLs**: `https://<SEU-PROJETO>.supabase.co/auth/v1/callback`
6. **Save** → **Continue** → **Save**

### 2.3 Criar Key para Sign In with Apple

1. Em **Keys** → clique no **+**
2. Nome: `Embaixadores SIWA Key`
3. Marque ✅ **Sign In with Apple** → **Configure**
4. Selecione o Primary App ID: `com.embaixadores.app`
5. **Save** → **Continue** → **Register**
6. **Download** o arquivo `.p8` (⚠️ só pode baixar UMA vez!)
7. Anote o **Key ID** (mostrado na página)
8. Anote seu **Team ID** (visível no canto superior direito do portal, ou em Membership)

> [!CAUTION]
> Guarde o arquivo `.p8` em local seguro! A Apple só permite baixar uma vez. Se perder, terá que revogar e criar uma nova key.

### Resumo do que você vai precisar para o Supabase

| Dado | Onde encontrar |
|------|----------------|
| Service ID | `com.embaixadores.app.service` (o que você criou no 2.2) |
| Team ID | Membership no Apple Developer |
| Key ID | Página da Key no portal |
| Arquivo `.p8` | Download feito no passo 2.3 |

---

## 3. Supabase Dashboard

### 3.1 Habilitar Provedor Google

1. Acesse o [dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto → **Authentication** → **Providers**
3. Encontre **Google** → clique para expandir → ative o toggle
4. Preencha:
   - **Client ID**: o Client ID **Web** criado no passo 1.3
   - **Client Secret**: o Client Secret **Web** criado no passo 1.3
5. **Save**

### 3.2 Habilitar Provedor Apple

1. Ainda em **Authentication** → **Providers**
2. Encontre **Apple** → clique para expandir → ative o toggle
3. Preencha:
   - **Service ID (for OAuth)**: `com.embaixadores.app.service` (criado no 2.2)
   - **Secret Key (p8)**: cole o **conteúdo completo** do arquivo `.p8` (abra com um editor de texto, copie tudo incluindo as linhas BEGIN/END)
   - **Key ID**: o Key ID anotado no passo 2.3
   - **Team ID**: seu Team ID da Apple
4. **Save**

### 3.3 Configurar Redirect URLs

1. Vá em **Authentication** → **URL Configuration**
2. Em **Redirect URLs**, adicione:
   ```
   embaixadores://
   com.embaixadores.app://
   ```
   Esses são os deep link schemes do app, usados para redirecionar de volta após o login OAuth.

### 3.4 Verificar

Após configurar tudo, a tela de **Providers** deve mostrar:

| Provedor | Status |
|----------|--------|
| Email    | ✅ Enabled |
| Google   | ✅ Enabled |
| Apple    | ✅ Enabled |

---

## Checklist Final

```
[ ] Google Cloud Console
    [ ] Projeto criado
    [ ] Tela de consentimento configurada
    [ ] Client ID Web criado → copiado para Supabase + .env
    [ ] Client ID iOS criado → copiado para .env
    [ ] Client ID Android criado → copiado para .env

[ ] Apple Developer Portal
    [ ] Sign In with Apple habilitado no App ID
    [ ] Service ID criado e configurado
    [ ] Key (.p8) criada e baixada

[ ] Supabase Dashboard
    [ ] Google habilitado com Client ID/Secret
    [ ] Apple habilitado com Service ID, Key, Team ID
    [ ] Redirect URLs adicionadas

[ ] .env do App (local e CI/CD)
    [ ] EXPO_PUBLIC_GOOGLE_CLIENT_ID
    [ ] EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    [ ] EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
```

> [!TIP]
> Teste primeiro com um único provedor (Google é mais fácil de configurar). Depois de confirmar que funciona, configure o Apple.
