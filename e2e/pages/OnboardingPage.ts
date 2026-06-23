/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Onboarding Page
 *  Encapsula seletores e ações da tela de onboarding (slides).
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class OnboardingPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly skipButton: Locator;
  readonly nextButton: Locator;
  readonly registerNowButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.skipButton = page.locator('[aria-label="Pular onboarding"]');
    this.nextButton = page.locator('[aria-label="Próximo slide"]');
    this.registerNowButton = page.locator('[aria-label="Cadastrar agora"]');
    this.loginLink = page.locator('[aria-label="Já tenho conta, fazer login"]');
  }

  // ═══ NAVIGATION ═══

  async goto() {
    // Onboarding is the first screen shown to new users
    // Clear storage to ensure onboarding is shown
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    // If onboarding appears, we're already there; otherwise we need a fresh context
  }

  // ═══ ACTIONS ═══

  async skip() {
    await this.skipButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToNextSlide() {
    await this.nextButton.click();
  }

  async goToRegister() {
    await this.registerNowButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToLogin() {
    await this.loginLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.skipButton).toBeVisible({ timeout: 10_000 });
  }

  async expectSlideText(text: string) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: 5_000 });
  }

  async expectNextButtonVisible() {
    await expect(this.nextButton).toBeVisible();
  }

  async expectRegisterNowButtonVisible() {
    await expect(this.registerNowButton).toBeVisible();
  }

  async expectLoginLinkVisible() {
    await expect(this.loginLink).toBeVisible();
  }
}
