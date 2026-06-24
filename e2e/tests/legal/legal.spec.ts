/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Legal (Termos de Uso + Política de Privacidade)
 *  Testa as páginas legais RF-AUTH-15
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Legal — Validação de UI', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to profile tab
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve carregar Termos de Uso', async ({ page }) => {
    await page.getByText('Termos de Uso').click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Termos de Uso da Rede de Embaixadores')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('1. Aceitação dos Termos')).toBeVisible();
  });

  test('deve exibir todas as seções dos Termos de Uso', async ({ page }) => {
    await page.getByText('Termos de Uso').click();
    await page.waitForLoadState('networkidle');

    const sections = [
      '1. Aceitação dos Termos',
      '2. Descrição do Serviço',
      '3. Cadastro e Conta',
      '4. Uso Aceitável',
      '5. Pontos e Recompensas',
      '6. Privacidade',
      '7. Exclusão de Conta',
      '8. Alterações nos Termos',
    ];

    for (const section of sections) {
      await expect(page.getByText(section)).toBeVisible();
    }
  });

  test('deve carregar Política de Privacidade', async ({ page }) => {
    await page.getByLabel('Política de Privacidade').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // The privacy policy content should be visible
    await expect(page.getByText('Proteção de Dados').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Termos de Uso deve ter botão Voltar', async ({ page }) => {
    await page.getByLabel('Termos de Uso').click();
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('[aria-label="Voltar"]').first();
    await expect(backButton).toBeVisible();

    // Click back should return to profile
    await backButton.click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('Editar Perfil')).toBeVisible({ timeout: 10_000 });
  });
});
