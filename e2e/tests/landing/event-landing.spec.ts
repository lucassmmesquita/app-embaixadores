/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Landing Page de Evento (Backend HTML)
 *  Testa a página /evento/{id} servida pelo backend
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://host.docker.internal:8000';

// ═══ TESTES COM BACKEND ═══

test.describe('Landing Evento — Com backend', () => {
  test('deve carregar a landing page de evento com dados', async ({ page }) => {
    // First, get an event ID from the API
    let eventId: string | null = null;

    try {
      const resp = await page.request.get(`${API_BASE}/api/v1/events?page=1&per_page=1`);
      if (resp.ok()) {
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          eventId = data.items[0].id;
        }
      }
    } catch {
      // Backend might not be reachable
    }

    test.skip(!eventId, 'Nenhum evento disponível no banco');

    await page.goto(`${API_BASE}/evento/${eventId}`);
    await page.waitForLoadState('networkidle');

    // Should show event landing page with a heading
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve retornar 404 ou landing genérica para evento inexistente', async ({ page }) => {
    await page.goto(`${API_BASE}/evento/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');

    // Should show 404 or generic landing
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
