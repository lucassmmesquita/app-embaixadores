/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Fluxo de Recuperação de Senha
 *  Testa o formulário "Esqueci minha senha"
 *  Usa Page Object Model (ForgotPasswordPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage';
import { setupApiRoute } from '../../fixtures/helpers';

// ═══ TESTES DE UI (não precisam de backend) ═══

test.describe('Recuperação de Senha — Validação de UI', () => {
  let forgotPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
  });

  test('deve exibir campo de email e botão de enviar', async () => {
    await forgotPage.expectVisible();
  });

  test('deve mostrar erro ao submeter com email vazio', async () => {
    await forgotPage.submit();
    await forgotPage.expectValidationError('E-mail é obrigatório');
  });

  test('deve validar email inválido', async () => {
    await forgotPage.fillEmail('email-invalido');
    // Trigger blur by clicking submit
    await forgotPage.submit();
    await forgotPage.expectValidationError('E-mail inválido');
  });

  test('deve ter link para voltar ao login', async ({ page }) => {
    await forgotPage.goBackToLogin();
    // Should navigate back to login
    await expect(page.locator('[aria-label="Entrar"][role="button"]').first()).toBeVisible({ timeout: 15_000 });
  });
});

// ═══ TESTES COM BACKEND ═══

test.describe('Recuperação de Senha — Com backend', () => {
  let forgotPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve mostrar tela de sucesso após enviar email válido', async () => {
    await forgotPage.fillEmail('e2e@teste.com');
    await forgotPage.submit();

    // Always shows success (RF-AUTH-16: prevent email enumeration)
    await forgotPage.expectSuccessState();
    await forgotPage.expectBackToLoginVisible();
    await forgotPage.expectTryAnotherEmailVisible();
  });

  test('botão "Tentar outro e-mail" deve voltar ao formulário', async () => {
    await forgotPage.fillEmail('teste@teste.com');
    await forgotPage.submit();
    await forgotPage.expectSuccessState();

    // Click "Tentar outro e-mail"
    await forgotPage.page.locator('[aria-label="Tentar outro e-mail"]').click();

    // Should show email input again
    await expect(forgotPage.emailInput).toBeVisible({ timeout: 10_000 });
  });
});
