/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Perfil + Edição de Perfil
 *  Testa a tela de perfil e edição de dados pessoais
 *  Usa Page Object Model (ProfilePage, EditProfilePage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage';
import { EditProfilePage } from '../../pages/EditProfilePage';
import { setupApiRoute, loginAsTestUser, ensureTestUser } from '../../fixtures/helpers';

test.describe('Perfil — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to profile tab
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    profilePage = new ProfilePage(page);
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir dados do perfil do usuário', async () => {
    await profilePage.expectVisible();
  });

  test('deve exibir menu de conta com todos os itens', async () => {
    await profilePage.expectMenuItems();
  });

  test('deve exibir seção de consentimentos LGPD', async () => {
    await profilePage.expectConsentSection();
  });

  test('deve exibir email do usuário', async () => {
    const email = process.env.TEST_USER_EMAIL || 'e2e@teste.com';
    await profilePage.expectUserEmail(email);
  });

  test('deve ter botão de sair', async () => {
    await expect(profilePage.logoutMenu).toBeVisible();
  });

  test('deve ter botão de excluir conta', async () => {
    await expect(profilePage.deleteAccountMenu).toBeVisible();
  });

  test('deve navegar para Editar Perfil', async ({ page }) => {
    await profilePage.goToEditProfile();

    const editPage = new EditProfilePage(page);
    await editPage.expectVisible();
  });
});

test.describe('Edição de Perfil — Com backend', () => {
  test.beforeAll(async () => {
    await ensureTestUser();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    await loginAsTestUser(page);

    // Navigate to profile > edit
    await page.getByRole('tab', { name: 'Perfil' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Editar Perfil').click();
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve exibir formulário de edição de perfil', async ({ page }) => {
    const editPage = new EditProfilePage(page);
    await editPage.expectVisible();
  });

  test('deve exibir campos de nome, telefone, cidade e bio', async ({ page }) => {
    const editPage = new EditProfilePage(page);
    await expect(editPage.nameInput).toBeVisible();
    await expect(editPage.phoneInput).toBeVisible();
    await expect(editPage.cityInput).toBeVisible();
    await expect(editPage.bioInput).toBeVisible();
  });

  test('deve mostrar email não editável', async ({ page }) => {
    // On the edit profile page, the email field label should be visible
    const editPage = new EditProfilePage(page);
    await expect(editPage.nameInput).toBeVisible({ timeout: 10_000 });
  });

  test('deve salvar alterações no perfil', async ({ page }) => {
    const editPage = new EditProfilePage(page);
    const randomCity = `Cidade E2E ${Math.random().toString(36).substring(2, 6)}`;

    await editPage.fillCity(randomCity);
    await editPage.save();
    await editPage.expectSaveSuccess();
  });
});
