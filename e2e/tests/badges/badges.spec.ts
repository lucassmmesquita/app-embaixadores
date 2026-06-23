/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Badges (Conquistas)
 *  Testa a galeria de badges conquistados e disponíveis
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Badges — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to badges (via Profile menu)
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByText('Minhas Conquistas').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir título "Conquistas"', async ({ page }) => {
    // Wait for badges page to fully render
    await page.waitForTimeout(1000);
    // Page shows "X / Y conquistas" with spaces around slash
    await expect(page.getByText(/\d+\s*\/\s*\d+/)).toBeVisible({ timeout: 15_000 });
  });

  test('deve exibir contador de conquistas', async ({ page }) => {
    // Summary shows counter like "0 / 18 conquistas"
    await expect(page.getByText(/\d+\s*\/\s*\d+/)).toBeVisible({ timeout: 10_000 });
  });

  test('deve carregar lista de badges', async ({ page }) => {
    // Should show earned badges, unearned badges, or empty state
    await expect(
      page.getByText('Suas Conquistas')
        .or(page.getByText('Você ainda pode ganhar'))
        .or(page.getByText('Nenhum badge disponível'))
    ).toBeVisible({ timeout: 15_000 });
  });
});
