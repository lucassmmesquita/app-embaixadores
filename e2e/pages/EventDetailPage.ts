/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Event Detail Page
 *  Encapsula seletores e ações da tela de detalhe de evento.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class EventDetailPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly backButton: Locator;
  readonly shareButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.locator('[aria-label="Voltar"]').first();
    this.shareButton = page.locator('[aria-label="Compartilhar evento"]');
  }

  // ═══ ACTIONS ═══

  async goBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    // Event detail shows event info
    await expect(
      this.page.getByText('Confirmar Presença')
        .or(this.page.getByText('Presença Confirmada'))
        .or(this.page.getByText('Check-in'))
        .or(this.page.getByText('Evento'))
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectTitle(title: string) {
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 10_000 });
  }

  async expectLocationVisible() {
    // Location or online indicator should be visible
    await expect(
      this.page.getByText('Local')
        .or(this.page.getByText('Online'))
        .or(this.page.getByText('Endereço'))
    ).toBeVisible({ timeout: 10_000 });
  }
}
