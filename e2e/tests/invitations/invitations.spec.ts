/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Convites (Invitations)
 *  Testa o código de referral, funil de convites e compartilhamento
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Convites — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to invitations (via Home quick action or Profile menu)
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByText('Meus Convites').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir funil de convites', async ({ page }) => {
    await expect(page.getByText('Funil de Convites')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Enviados')).toBeVisible();
    await expect(page.getByText('Cadastrados')).toBeVisible();
    await expect(page.getByText('Verificados')).toBeVisible();
  });

  test('deve exibir código de convite', async ({ page }) => {
    await expect(page.getByText('Seu código de convite')).toBeVisible({ timeout: 15_000 });
  });

  test('deve ter botão "Compartilhar Convite"', async ({ page }) => {
    await expect(page.getByText('Compartilhar Convite')).toBeVisible({ timeout: 10_000 });
  });

  test('deve ter botão "Copiar Link"', async ({ page }) => {
    await expect(page.getByText('Copiar Link')).toBeVisible({ timeout: 10_000 });
  });

  test('deve exibir lista de convites ou estado vazio', async ({ page }) => {
    await expect(
      page.getByText('Convites Enviados')
        .or(page.getByText('Nenhum convite enviado'))
    ).toBeVisible({ timeout: 15_000 });
  });
});
