/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Navegação entre Tabs
 *  Testa a tab bar após login e navegação entre telas
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Navegação — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir tab bar com 5 tabs após login', async ({ page }) => {
    const tabs = ['Início', 'Missões', 'Ranking', 'Eventos', 'Perfil'];
    for (const tab of tabs) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible({ timeout: 10_000 });
    }
  });

  test('deve navegar para Missões', async ({ page }) => {
    await page.getByRole('tab', { name: 'Missões' }).click();
    await page.waitForLoadState('networkidle');

    // Missions page should show tabs (Disponíveis, Em Progresso, Concluídas)
    await expect(page.getByText('Disponíveis')).toBeVisible({ timeout: 10_000 });
  });

  test('deve navegar para Ranking', async ({ page }) => {
    await page.getByRole('tab', { name: 'Ranking' }).click();
    await page.waitForLoadState('networkidle');

    // Ranking shows "Sua posição"
    await expect(page.getByText('Sua posição')).toBeVisible({ timeout: 10_000 });
  });

  test('deve navegar para Eventos', async ({ page }) => {
    await page.getByRole('tab', { name: 'Eventos' }).click();
    await page.waitForLoadState('networkidle');

    // Events page shows event list or empty state
    await expect(
      page.getByText('Nenhum evento próximo')
        .or(page.getByText('pts por participar').first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test('deve navegar para Perfil', async ({ page }) => {
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');

    // Profile shows Editar Perfil menu item
    await expect(page.getByLabel('Editar Perfil')).toBeVisible({ timeout: 10_000 });
  });

  test('deve navegar entre todas as tabs sem erros', async ({ page }) => {
    const tabs = ['Missões', 'Ranking', 'Eventos', 'Perfil', 'Início'];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForLoadState('networkidle');
      // Brief wait to ensure no crash
      await page.waitForTimeout(500);
    }

    // After cycling back to Início, greeting should be visible
    await expect(page.getByText('Olá,')).toBeVisible({ timeout: 10_000 });
  });
});
