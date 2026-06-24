/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Notificações
 *  Testa a central de notificações in-app
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Notificações — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to notifications (via Profile menu)
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByText('Notificações').first().click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve carregar listagem de notificações ou estado vazio', async ({ page }) => {
    const allRead = await page.getByText(/Todas lidas/).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const hasNew = await page.getByText(/nova[s]? notificaç/).first().isVisible({ timeout: 2_000 }).catch(() => false);
    const isEmpty = await page.getByText('Sem notificações').first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(allRead || hasNew || isEmpty).toBeTruthy();
  });

  test('deve exibir indicador de notificações não lidas ou "Todas lidas"', async ({ page }) => {
    const allRead = await page.getByText(/Todas lidas/).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasNew = await page.getByText(/nova[s]? notificaç/).first().isVisible({ timeout: 2_000 }).catch(() => false);
    expect(allRead || hasNew).toBeTruthy();
  });
});
