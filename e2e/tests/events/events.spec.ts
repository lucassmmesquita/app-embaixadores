/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Eventos
 *  Testa listagem de eventos e navegação para detalhes
 *  Usa Page Object Model (EventsPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { EventsPage } from '../../pages/EventsPage';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Eventos — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let eventsPage: EventsPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to events tab
    await page.getByRole('tab', { name: 'Eventos' }).click();
    await page.waitForLoadState('networkidle');
    eventsPage = new EventsPage(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve carregar listagem de eventos', async () => {
    await eventsPage.expectEventsLoaded();
  });

  test('deve navegar para detalhe ao clicar em um evento', async ({ page }) => {
    // Wait for events to load
    await eventsPage.expectEventsLoaded();

    // Check if there are event cards (not empty state)
    const ptsText = page.getByText('pts por participar');
    const hasEvents = await ptsText.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasEvents) {
      // Click on first event pts text (triggers card navigation)
      await ptsText.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Event detail page shows a back button and event info
      await expect(page.getByRole('button', { name: 'Voltar' }).first()).toBeVisible({ timeout: 10_000 });
    }
  });
});
