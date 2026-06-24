/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Profile Page
 *  Encapsula seletores e ações da tela de Perfil.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly userName: Locator;
  readonly userEmail: Locator;
  readonly levelTag: Locator;
  readonly editProfileMenu: Locator;
  readonly notificationsMenu: Locator;
  readonly badgesMenu: Locator;
  readonly historyMenu: Locator;
  readonly invitationsMenu: Locator;
  readonly termsMenu: Locator;
  readonly privacyMenu: Locator;
  readonly logoutMenu: Locator;
  readonly deleteAccountMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userName = page.locator('[aria-label="Nome do usuário"]');
    this.userEmail = page.locator('[aria-label="E-mail do usuário"]');
    this.levelTag = page.locator('[aria-label="Nível do usuário"]');
    this.editProfileMenu = page.getByLabel('Editar Perfil');
    this.notificationsMenu = page.getByLabel('Notificações');
    this.badgesMenu = page.getByLabel('Minhas Conquistas');
    this.historyMenu = page.getByLabel('Histórico de Pontos');
    this.invitationsMenu = page.getByLabel('Meus Convites');
    this.termsMenu = page.getByLabel('Termos de Uso');
    this.privacyMenu = page.getByLabel('Política de Privacidade');
    this.logoutMenu = page.getByLabel('Sair da Conta');
    this.deleteAccountMenu = page.getByLabel('Excluir Conta');
  }

  // ═══ NAVIGATION ═══

  async goToEditProfile() {
    await this.editProfileMenu.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToBadges() {
    await this.badgesMenu.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToHistory() {
    await this.historyMenu.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToInvitations() {
    await this.invitationsMenu.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    // Profile shows user info and menu items
    await expect(this.editProfileMenu).toBeVisible({ timeout: 15_000 });
  }

  async expectUserName(name: string) {
    await expect(this.page.getByText(name)).toBeVisible();
  }

  async expectUserEmail(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectMenuItems() {
    await expect(this.editProfileMenu).toBeVisible();
    await expect(this.badgesMenu).toBeVisible();
    await expect(this.historyMenu).toBeVisible();
    await expect(this.invitationsMenu).toBeVisible();
    await expect(this.termsMenu).toBeVisible();
    await expect(this.privacyMenu).toBeVisible();
    await expect(this.logoutMenu).toBeVisible();
  }

  async expectConsentSection() {
    await expect(this.page.getByText('PRIVACIDADE (LGPD)')).toBeVisible();
    await expect(this.page.getByText('Tratamento de dados')).toBeVisible();
    await expect(this.page.getByText('Comunicações')).toBeVisible();
    await expect(this.page.getByText('Ranking público')).toBeVisible();
  }
}
