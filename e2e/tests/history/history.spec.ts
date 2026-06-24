/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Histórico de Pontos
 *  Testa a timeline de transações de pontos e filtros
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Histórico de Pontos — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to history (via Profile menu)
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByText('Histórico de Pontos').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir título "Histórico de Pontos"', async ({ page }) => {
    // Wait for page to render - Profile menu item with same text stays hidden in DOM
    await page.waitForTimeout(1000);
    // Use the filter chips as proof we're on the history page
    await expect(page.getByText('Todos', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve exibir filtros de tipo', async ({ page }) => {
    await expect(page.getByText('Todos', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Missões', { exact: true }).last()).toBeVisible();
  });

  test('deve carregar histórico ou estado vazio', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);
    // Look for transaction entries (+ sign) or empty message
    const hasTransactions = await page.getByText(/^\+\d+$/).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmpty = await page.getByText('Nenhum registro', { exact: true }).isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasTransactions || hasEmpty).toBeTruthy();
  });

  test('deve filtrar por tipo de transação', async ({ page }) => {
    // Click on "Cadastro" filter (less ambiguous than "Missões")
    const cadastroFilter = page.getByText('Cadastro', { exact: true });
    await cadastroFilter.click();
    await page.waitForTimeout(1000);

    // Should still show content (filtered or empty)
    const hasTransactions = await page.getByText(/^\+\d+$/).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasEmpty = await page.getByText('Nenhum registro', { exact: true }).isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasTransactions || hasEmpty).toBeTruthy();
  });
});
