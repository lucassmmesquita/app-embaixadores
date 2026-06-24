/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Landing Page de Convite (Backend HTML)
 *  Testa as páginas /convite e /convite/{code} servidas pelo backend
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://host.docker.internal:8000';

// ═══ TESTES DE UI (aponta diretamente para o backend) ═══

test.describe('Landing Convite — Validação de UI', () => {
  test('deve carregar a landing page genérica /convite', async ({ page }) => {
    await page.goto(`${API_BASE}/convite`);
    await page.waitForLoadState('networkidle');

    // Should show the invite landing page with CTA
    await expect(page.getByText('Rede de Embaixadores').first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve carregar a landing page com código /convite/{code}', async ({ page }) => {
    await page.goto(`${API_BASE}/convite/TESTCODE`);
    await page.waitForLoadState('networkidle');

    // Should show the invite landing with the code
    await expect(page.getByText('Rede de Embaixadores').first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve ter botão "Abrir o Aplicativo" ou similar CTA', async ({ page }) => {
    await page.goto(`${API_BASE}/convite`);
    await page.waitForLoadState('networkidle');

    // Landing page has CTA button
    await expect(
      page.getByRole('button', { name: 'Abrir o Aplicativo' })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir badges de App Store / Google Play', async ({ page }) => {
    await page.goto(`${API_BASE}/convite`);
    await page.waitForLoadState('networkidle');

    // Landing page has store badges
    await expect(
      page.getByRole('button', { name: /App Store/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
