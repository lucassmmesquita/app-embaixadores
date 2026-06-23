/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Events Page (List)
 *  Encapsula seletores e ações da tela de listagem de eventos.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class EventsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ═══ ACTIONS ═══

  async clickEvent(title: string) {
    await this.page.getByText(title).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    // Events page shows event cards or empty state
    await expect(
      this.page.getByText('Nenhum evento próximo')
        .or(this.page.locator('[role="button"]').first())
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectEventsLoaded() {
    // Wait for events to be visible (or empty state)
    await expect(
      this.page.getByText('pts por participar').first()
        .or(this.page.getByText('Nenhum evento próximo'))
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectEventCard(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectEmptyState() {
    await expect(this.page.getByText('Nenhum evento próximo')).toBeVisible({ timeout: 10_000 });
  }
}
