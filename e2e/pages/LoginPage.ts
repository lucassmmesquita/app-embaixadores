/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Login Page
 *  Encapsula todos os seletores e ações da tela de login.
 *  React Native Web renderiza com aria-label nos elementos.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly showPasswordButton: Locator;
  readonly hidePasswordButton: Locator;

  // Onboarding
  readonly skipOnboardingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[aria-label="Campo de e-mail"]');
    this.passwordInput = page.locator('[aria-label="Campo de senha"]');
    this.submitButton = page.locator('[aria-label="Entrar"][role="button"]').first();
    this.googleButton = page.locator('[aria-label="Entrar com Google"]');
    this.forgotPasswordLink = page.locator('[aria-label="Esqueci minha senha"]');
    this.registerLink = page.locator('[aria-label="Cadastre-se"]');
    this.showPasswordButton = page.locator('[aria-label="Mostrar senha"]');
    this.hidePasswordButton = page.locator('[aria-label="Ocultar senha"]');

    // Onboarding screen
    this.skipOnboardingButton = page.locator('[aria-label="Pular onboarding"]');
  }

  // ═══ NAVIGATION ═══

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Skip onboarding if it appears
    try {
      await this.skipOnboardingButton.click({ timeout: 5_000 });
      await this.page.waitForLoadState('networkidle');
    } catch {
      // Onboarding may not appear (already seen or direct /login route)
    }

    await expect(this.submitButton).toBeVisible({ timeout: 15_000 });
  }

  // ═══ ACTIONS ═══

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async togglePasswordVisibility() {
    const showBtn = this.showPasswordButton;
    const hideBtn = this.hidePasswordButton;

    if (await showBtn.isVisible()) {
      await showBtn.click();
    } else if (await hideBtn.isVisible()) {
      await hideBtn.click();
    }
  }

  async goToRegister() {
    await this.registerLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5_000 });
  }

  async expectLoginError() {
    await expect(
      this.page.getByText('incorretos')
        .or(this.page.getByText('não encontrada'))
        .or(this.page.getByText('Falha na autenticação'))
        .or(this.page.getByText('E-mail ou senha incorretos'))
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectLoginSuccess() {
    // Após login, o app redireciona para as tabs. Verificamos pela tab "Missões"
    await expect(
      this.page.getByRole('tab', { name: 'Missões' })
    ).toBeVisible({ timeout: 15_000 });
  }
}
