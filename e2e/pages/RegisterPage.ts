/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Register Page
 *  Encapsula todos os seletores e ações da tela de cadastro.
 *  React Native Web renderiza com aria-label nos elementos.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly referralCodeInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;

  // Consentimentos LGPD
  readonly consentDataProcessing: Locator;
  readonly consentCommunication: Locator;
  readonly consentPublicRanking: Locator;

  // Social
  readonly googleButton: Locator;

  // Onboarding
  readonly skipOnboardingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('[aria-label="Nome Completo"]');
    this.emailInput = page.locator('[aria-label="E-mail"]');
    this.phoneInput = page.locator('[aria-label="Telefone"]');
    this.passwordInput = page.locator('[aria-label="Senha"]');
    this.confirmPasswordInput = page.locator('[aria-label="Confirmar Senha"]');
    this.referralCodeInput = page.locator('[aria-label="Código de indicação"]');
    this.submitButton = page.locator('[aria-label="Criar conta"]');
    this.loginLink = page.locator('[aria-label="Cadastre-se"]');

    this.consentDataProcessing = page.locator('[aria-label="Tratamento de dados pessoais"]');
    this.consentCommunication = page.locator('[aria-label="Receber comunicações da campanha"]');
    this.consentPublicRanking = page.locator('[aria-label="Exibir meu nome no ranking público"]');

    this.googleButton = page.locator('[aria-label="Cadastrar com Google"]');

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

    // Navigate from login to register
    await this.page.locator('[aria-label="Cadastre-se"]').click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.submitButton).toBeVisible({ timeout: 15_000 });
  }

  // ═══ ACTIONS ═══

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPhone(phone: string) {
    await this.phoneInput.fill(phone);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async fillReferralCode(code: string) {
    await this.referralCodeInput.fill(code);
  }

  async acceptDataProcessing() {
    await this.consentDataProcessing.click();
  }

  async acceptCommunication() {
    await this.consentCommunication.click();
  }

  async acceptPublicRanking() {
    await this.consentPublicRanking.click();
  }

  async submit() {
    await this.submitButton.click();
  }

  async register(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    acceptData?: boolean;
    acceptComm?: boolean;
  }) {
    await this.fillName(data.fullName);
    await this.fillEmail(data.email);
    if (data.phone) await this.fillPhone(data.phone);
    await this.fillPassword(data.password);
    await this.fillConfirmPassword(data.password);
    if (data.acceptData !== false) await this.acceptDataProcessing();
    if (data.acceptComm) await this.acceptCommunication();
    await this.submit();
  }

  async goToLogin() {
    await this.page.getByRole('link', { name: 'Entrar' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.phoneInput).toBeVisible();
    await expect(this.consentDataProcessing).toBeVisible();
    await expect(this.consentCommunication).toBeVisible();
    await expect(this.consentPublicRanking).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async expectValidationError(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5_000 });
  }

  async expectPasswordStrength(label: string) {
    await expect(this.page.getByText(label)).toBeVisible({ timeout: 3_000 });
  }

  async expectSubmitDisabled() {
    // React Native Web uses aria-disabled
    await expect(this.submitButton).toHaveAttribute('aria-disabled', 'true');
  }

  async expectRegistrationSuccess() {
    await expect(
      this.page.getByText('Conta criada')
        .or(this.page.getByText('Verifique seu e-mail'))
        .or(this.page.getByText('Conta criada com sucesso'))
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectRegistrationError(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(
        this.page.getByText('já está cadastrado').or(this.page.getByText('Falha no cadastro'))
      ).toBeVisible({ timeout: 10_000 });
    }
  }
}
