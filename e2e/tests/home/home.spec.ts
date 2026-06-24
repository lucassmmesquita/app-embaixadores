/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Home Screen (Dashboard)
 *  Testa o dashboard principal após login
 *  Usa Page Object Model (HomePage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Home — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);
    homePage = new HomePage(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir saudação com nome do usuário', async () => {
    await homePage.expectVisible();
  });

  test('deve exibir cards de estatísticas', async () => {
    await homePage.expectStatsVisible();
  });

  test('deve exibir seção de ações rápidas', async () => {
    await homePage.expectQuickActionsVisible();
  });

  test('deve exibir seção de missões em destaque', async () => {
    await homePage.expectFeaturedMissionsSection();
  });

  test('deve ter link "Ver todas as missões"', async () => {
    await homePage.expectViewAllMissionsLink();
  });

  test('deve exibir jornada de nível', async () => {
    await homePage.expectLevelJourneyVisible();
  });

  test('clicar em "Ver todas" deve navegar para missões', async ({ page }) => {
    await homePage.viewAllMissionsLink.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to missions tab
    await expect(page.getByText('Disponíveis')).toBeVisible({ timeout: 10_000 });
  });
});
