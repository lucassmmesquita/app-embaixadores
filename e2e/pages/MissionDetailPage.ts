/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Mission Detail Page
 *  Encapsula seletores e ações da tela de detalhe de missão.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class MissionDetailPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly title: Locator;
  readonly description: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[aria-label="Título da missão"]');
    this.description = page.locator('[aria-label="Descrição da missão"]');
    this.backButton = page.locator('[aria-label="Voltar"]').first();
  }

  // ═══ ACTIONS ═══

  async goBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    // Mission detail shows title and points
    await expect(this.page.getByText('pontos').first()).toBeVisible({ timeout: 15_000 });
  }

  async expectTitle(title: string) {
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 10_000 });
  }

  async expectPointsReward() {
    await expect(this.page.getByText('pontos').first()).toBeVisible();
  }

  async expectActionButton() {
    // Mission detail has action buttons like "Iniciar Missão", "Enviar Comprovação", etc.
    await expect(
      this.page.getByText('Iniciar Missão')
        .or(this.page.getByText('Enviar'))
        .or(this.page.getByText('Em Progresso'))
        .or(this.page.getByText('Concluída'))
    ).toBeVisible({ timeout: 10_000 });
  }
}
