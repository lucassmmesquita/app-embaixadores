/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Ranking (Leaderboard)
 *  Testa o leaderboard, posição do usuário e filtros
 *  Usa Page Object Model (RankingPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { RankingPage } from '../../pages/RankingPage';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Ranking — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let rankingPage: RankingPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to ranking tab
    await page.getByRole('tab', { name: 'Ranking' }).click();
    await page.waitForLoadState('networkidle');
    rankingPage = new RankingPage(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir "Sua posição" no topo', async () => {
    await rankingPage.expectVisible();
  });

  test('deve exibir posição e pontos do usuário', async () => {
    await rankingPage.expectMyPosition();
  });

  test('deve exibir filtros de leaderboard', async () => {
    await rankingPage.expectFiltersVisible();
  });

  test('deve carregar o leaderboard', async () => {
    await rankingPage.expectLeaderboardLoaded();
  });

  test('deve alternar entre filtros Top 10 / Top 50 / Todos', async ({ page }) => {
    // Click Top 10
    await rankingPage.selectTop10();
    await page.waitForLoadState('networkidle');
    await rankingPage.expectLeaderboardLoaded();

    // Click Todos
    await rankingPage.selectAll();
    await page.waitForLoadState('networkidle');
    await rankingPage.expectLeaderboardLoaded();

    // Back to Top 50
    await rankingPage.selectTop50();
    await page.waitForLoadState('networkidle');
    await rankingPage.expectLeaderboardLoaded();
  });
});
