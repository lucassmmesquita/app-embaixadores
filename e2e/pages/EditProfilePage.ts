/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Edit Profile Page
 *  Encapsula seletores e ações da tela de edição de perfil.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class EditProfilePage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly cityInput: Locator;
  readonly bioInput: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('[aria-label="Nome completo"]');
    this.phoneInput = page.locator('[aria-label="Telefone"]');
    this.cityInput = page.locator('[aria-label="Cidade"]');
    this.bioInput = page.locator('[aria-label="Biografia"]');
    this.saveButton = page.locator('[aria-label="Salvar perfil"]');
    this.backButton = page.locator('[aria-label="Voltar"]').first();
  }

  // ═══ ACTIONS ═══

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillPhone(phone: string) {
    await this.phoneInput.fill(phone);
  }

  async fillCity(city: string) {
    await this.cityInput.fill(city);
  }

  async fillBio(bio: string) {
    await this.bioInput.fill(bio);
  }

  async save() {
    await this.saveButton.click();
  }

  async goBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.nameInput).toBeVisible({ timeout: 15_000 });
    await expect(this.saveButton).toBeVisible();
  }

  async expectNameValue(name: string) {
    await expect(this.nameInput).toHaveValue(name);
  }

  async expectSaveSuccess() {
    await expect(
      this.page.getByText('Perfil atualizado com sucesso')
    ).toBeVisible({ timeout: 10_000 });
  }
}
