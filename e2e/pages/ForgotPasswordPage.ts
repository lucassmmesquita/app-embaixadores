/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Forgot Password Page
 *  Encapsula seletores e ações da tela de recuperação de senha.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class ForgotPasswordPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly backButton: Locator;
  readonly backToLoginButton: Locator;
  readonly tryAnotherEmailButton: Locator;

  // Onboarding
  readonly skipOnboardingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[aria-label="Campo de e-mail"]').last();
    this.submitButton = page.locator('[aria-label="Enviar instruções"]').first();
    this.backButton = page.locator('[aria-label="Voltar"]').first();
    this.backToLoginButton = page.locator('[aria-label="Voltar para o login"]');
    this.tryAnotherEmailButton = page.locator('[aria-label="Tentar outro e-mail"]');

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
      // Onboarding may not appear
    }

    // Click "Esqueci minha senha" link
    await this.page.locator('[aria-label="Esqueci minha senha"]').click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.submitButton).toBeVisible({ timeout: 15_000 });
  }

  // ═══ ACTIONS ═══

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submit() {
    await this.submitButton.click();
  }

  async goBackToLogin() {
    await this.backButton.click();
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5_000 });
  }

  async expectSuccessState() {
    await expect(this.page.getByText('Verifique seu e-mail')).toBeVisible({ timeout: 10_000 });
  }

  async expectTryAnotherEmailVisible() {
    await expect(this.tryAnotherEmailButton).toBeVisible();
  }

  async expectBackToLoginVisible() {
    await expect(this.backToLoginButton).toBeVisible();
  }
}
