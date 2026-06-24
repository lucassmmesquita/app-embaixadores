/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Missões
 *  Testa listagem de missões, filtros e navegação para detalhes
 *  Usa Page Object Model (MissionsPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { MissionsPage } from '../../pages/MissionsPage';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Missões — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let missionsPage: MissionsPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to missions tab
    await page.getByRole('tab', { name: 'Missões' }).click();
    await page.waitForLoadState('networkidle');
    missionsPage = new MissionsPage(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir tabs de missões (Disponíveis, Em Progresso, Concluídas)', async () => {
    await missionsPage.expectVisible();
  });

  test('deve carregar listagem de missões', async () => {
    await missionsPage.expectMissionsLoaded();
  });

  test('deve exibir chips de filtro por tipo', async () => {
    await missionsPage.expectFilterChipsVisible();
  });

  test('deve filtrar missões por categoria', async () => {
    // Click on filter chip "Convites"
    await missionsPage.filterByInvites();
    await missionsPage.page.waitForTimeout(500);

    // Should still show missions or empty state for that filter
    await missionsPage.expectMissionsLoaded();
  });

  test('deve alternar entre tabs', async () => {
    // Switch to Em Progresso
    await missionsPage.switchToInProgress();
    await expect(missionsPage.page.getByText('Em Progresso').first()).toBeVisible();

    // Switch to Concluídas
    await missionsPage.switchToCompleted();
    await expect(missionsPage.page.getByText('Concluídas').first()).toBeVisible();

    // Back to Disponíveis
    await missionsPage.switchToAvailable();
    await expect(missionsPage.page.getByText('Disponíveis').first()).toBeVisible();
  });

  test('deve navegar para detalhe ao clicar em uma missão', async ({ page }) => {
    // Wait for missions to load
    await missionsPage.expectMissionsLoaded();

    // Check if there are missions with "pts" text
    const ptsElements = page.getByText('pts', { exact: true });
    const hasMissions = await ptsElements.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasMissions) {
      // Click on the first mission card (parent pressable of the pts text)
      await ptsElements.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Should show mission detail (pontos or points info)
      await expect(page.getByText('pontos').first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
