/**
 * ═══════════════════════════════════════════════════════════════
 *  Test Helpers — Constantes e utilidades para os testes E2E
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, expect } from '@playwright/test';

/** Gera dados únicos para um usuário de teste */
export function generateTestUser() {
  const id = Math.random().toString(36).substring(2, 10);
  return {
    fullName: `Teste E2E ${id}`,
    email: `teste.e2e.${id}@teste.com`,
    phone: '11999990000',
    password: 'Teste@123',
  };
}

/** Seletores reutilizáveis baseados nos accessibilityLabel do app */
export const selectors = {
  // Login
  loginEmailInput: '[aria-label="Campo de e-mail"]',
  loginPasswordInput: '[aria-label="Campo de senha"]',
  loginButton: '[aria-label="Entrar"]',
  loginGoogleButton: '[aria-label="Entrar com Google"]',
  registerLink: 'text=Cadastre-se',

  // Register
  registerNameInput: '[aria-label="Nome Completo"]',
  registerEmailInput: '[aria-label="E-mail"]',
  registerPhoneInput: '[aria-label="Telefone"]',
  registerPasswordInput: '[aria-label="Senha"]',
  registerConfirmPasswordInput: '[aria-label="Confirmar Senha"]',
  registerReferralInput: '[aria-label="Código de indicação"]',
  registerConsentData: '[aria-label="Tratamento de dados pessoais"]',
  registerConsentComm: '[aria-label="Receber comunicações da campanha"]',
  registerConsentRanking: '[aria-label="Exibir meu nome no ranking público"]',
  registerSubmitButton: '[aria-label="Criar conta"]',
  loginLink: 'text=Entrar',

  // Navigation (after login)
  homeTab: '[aria-label="Início"]',
  missionsTab: '[aria-label="Missões"]',
  eventsTab: '[aria-label="Eventos"]',
  rankingTab: '[aria-label="Ranking"]',
  profileTab: '[aria-label="Perfil"]',
};

/** Timeouts comuns */
export const timeouts = {
  navigation: 15_000,
  apiResponse: 10_000,
  toast: 5_000,
};

/**
 * Configura roteamento Docker: redireciona chamadas localhost:8000 → host.docker.internal:8000
 * Necessário porque Chromium roda dentro do container Docker
 */
export async function setupApiRoute(page: Page) {
  await page.route('**/localhost:8000/**', async (route) => {
    const url = route.request().url().replace('localhost:8000', 'host.docker.internal:8000');
    const response = await route.fetch({ url });
    await route.fulfill({ response });
  });
}

/**
 * Faz login com o usuário de teste (env vars TEST_USER_EMAIL / TEST_USER_PASSWORD)
 * Pula onboarding se aparecer, navega até login, faz login, e espera as tabs carregarem
 */
export async function loginAsTestUser(page: Page) {
  const email = process.env.TEST_USER_EMAIL || 'e2e@teste.com';
  const password = process.env.TEST_USER_PASSWORD || 'Teste@123';

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Skip onboarding if it appears
  try {
    await page.locator('[aria-label="Pular onboarding"]').click({ timeout: 5_000 });
    await page.waitForLoadState('networkidle');
  } catch {
    // Onboarding may not appear
  }

  // Fill login form
  const loginButton = page.locator('[aria-label="Entrar"][role="button"]').first();
  await expect(loginButton).toBeVisible({ timeout: 15_000 });

  await page.locator(selectors.loginEmailInput).fill(email);
  await page.locator(selectors.loginPasswordInput).fill(password);
  await loginButton.click();

  // Wait for tabs to load (indicates successful login)
  await expect(
    page.getByRole('tab', { name: 'Missões' })
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * Garante que o usuário de teste existe no backend (idempotente)
 */
export async function ensureTestUser() {
  const apiBase = process.env.API_BASE_URL || 'http://host.docker.internal:8000';
  const email = process.env.TEST_USER_EMAIL || 'e2e@teste.com';
  const password = process.env.TEST_USER_PASSWORD || 'Teste@123';

  try {
    const resp = await fetch(`${apiBase}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Usuário E2E',
        email,
        password,
        consents: [{ consent_type: 'data_processing', accepted: true }],
      }),
    });
    if (resp.ok) {
      console.log(`✅ Usuário E2E criado: ${email}`);
    } else {
      console.log(`ℹ️  Usuário E2E já existe: ${email}`);
    }
  } catch {
    console.warn(`⚠️ Backend inacessível — usuário E2E deve ser criado manualmente`);
  }
}
