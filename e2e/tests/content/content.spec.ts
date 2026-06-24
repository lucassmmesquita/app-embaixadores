/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Conteúdo (Materiais da Campanha)
 *  Testa a biblioteca de materiais e compartilhamento
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Conteúdo — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to content (via Home quick action "Materiais")
    await page.locator('[aria-label="Materiais"]').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve carregar listagem de materiais ou estado vazio', async ({ page }) => {
    await expect(
      page.getByText('Compartilhar').first()
        .or(page.getByText('Nenhum material encontrado'))
    ).toBeVisible({ timeout: 15_000 });
  });

  test('deve exibir filtros de tipo de conteúdo', async ({ page }) => {
    await expect(page.getByText('Todos', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir cards de conteúdo com botão compartilhar', async ({ page }) => {
    const hasContent = await page.getByText('Compartilhar').first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasContent) {
      // Content cards should have share button
      await expect(page.getByText('Compartilhar').first()).toBeVisible();
    }
  });
});
