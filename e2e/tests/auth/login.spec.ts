/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Fluxo de Login (Email/Senha)
 *  Testa autenticação via formulário
 *  Usa Page Object Model (LoginPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ensureTestUser, setupApiRoute } from '../../fixtures/helpers';

// ═══ TESTES DE UI (não precisam de backend) ═══

test.describe('Login — Validação de UI', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('deve exibir campos de email e senha', async () => {
    await loginPage.expectVisible();
  });

  test('deve mostrar erros de validação ao submeter vazio', async () => {
    await loginPage.submit();

    await loginPage.expectValidationError('E-mail é obrigatório');
    await loginPage.expectValidationError('Senha é obrigatória');
  });

  test('deve validar email inválido', async () => {
    await loginPage.fillEmail('nao-e-email');
    await loginPage.fillPassword(''); // trigger blur

    await loginPage.expectValidationError('E-mail inválido');
  });

  test('deve validar senha curta', async () => {
    await loginPage.fillPassword('123');
    await loginPage.fillEmail(''); // trigger blur

    await loginPage.expectValidationError('Mínimo de 6 caracteres');
  });

  test('deve ter link "Esqueci minha senha"', async () => {
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('deve ter link para tela de cadastro', async ({ page }) => {
    await expect(loginPage.registerLink).toBeVisible();
    await loginPage.goToRegister();

    await expect(page.locator('[aria-label="Criar conta"]')).toBeVisible({ timeout: 15_000 });
  });

  test('deve mostrar/ocultar senha ao clicar no ícone', async () => {
    await loginPage.fillPassword('minhaSenha');

    // Inicialmente: botão "Mostrar senha" visível
    await expect(loginPage.showPasswordButton).toBeVisible();

    // Clica para mostrar
    await loginPage.showPasswordButton.click();
    await expect(loginPage.hidePasswordButton).toBeVisible();

    // Clica para ocultar
    await loginPage.hidePasswordButton.click();
    await expect(loginPage.showPasswordButton).toBeVisible();
  });
});

// ═══ TESTES COM BACKEND (precisam do backend rodando) ═══
// Usam usuário fixo via env vars (TEST_USER_EMAIL / TEST_USER_PASSWORD).
// Crie o usuário uma única vez no banco local:
//   curl -X POST http://localhost:8000/api/v1/auth/register \
//     -H 'Content-Type: application/json' \
//     -d '{"full_name":"Usuário E2E","email":"e2e@teste.com","password":"Teste@123",
//          "consents":[{"consent_type":"data_processing","accepted":true}]}'

test.describe('Login — Com backend', () => {
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  test.skip(!testEmail || !testPassword, 'TEST_USER_EMAIL e TEST_USER_PASSWORD não definidos');

  // Garante que o usuário de teste existe (idempotente)
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve rejeitar credenciais inválidas', async () => {
    await loginPage.login('nao-existe@teste.com', 'SenhaErrada123');
    await loginPage.expectLoginError();
  });

  test('deve fazer login com sucesso e acessar o app', async ({ page }) => {
    await loginPage.login(testEmail!, testPassword!);
    await loginPage.expectLoginSuccess();

    // Verifica que saiu da tela de auth
    await expect(page).not.toHaveURL(/login/, { timeout: 15_000 });
  });
});
