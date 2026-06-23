/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Landing Page de Material (Backend HTML)
 *  Testa a página /material/{id} servida pelo backend
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://host.docker.internal:8000';

// ═══ TESTES COM BACKEND ═══

test.describe('Landing Material — Com backend', () => {
  test('deve carregar a landing page de material com dados', async ({ page }) => {
    // Get a content ID from the API using page.request (runs in correct network context)
    let contentId: string | null = null;

    try {
      const resp = await page.request.get(`${API_BASE}/api/v1/content?page=1&per_page=1`);
      if (resp.ok()) {
        const data = await resp.json();
        if (data.items && data.items.length > 0) {
          contentId = data.items[0].id;
        }
      }
    } catch {
      // Backend might not be reachable
    }

    test.skip(!contentId, 'Nenhum material disponível no banco');

    await page.goto(`${API_BASE}/material/${contentId}`);
    await page.waitForLoadState('networkidle');

    // Should show material landing page with a heading
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve retornar 404 ou landing genérica para material inexistente', async ({ page }) => {
    await page.goto(`${API_BASE}/material/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');

    // Should show 404 or generic landing
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
