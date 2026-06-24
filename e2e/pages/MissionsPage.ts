/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Missions Page (List)
 *  Encapsula seletores e ações da tela de listagem de missões.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class MissionsPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly availableTab: Locator;
  readonly inProgressTab: Locator;
  readonly completedTab: Locator;
  readonly filterAll: Locator;
  readonly filterInvites: Locator;
  readonly filterEvents: Locator;
  readonly filterMaterials: Locator;

  constructor(page: Page) {
    this.page = page;
    this.availableTab = page.getByText('Disponíveis');
    this.inProgressTab = page.getByText('Em Progresso');
    this.completedTab = page.getByText('Concluídas');
    this.filterAll = page.getByText('Todas', { exact: true }).first();
    this.filterInvites = page.getByText('Convites', { exact: true }).first();
    this.filterEvents = page.getByText('Eventos', { exact: true }).first();
    this.filterMaterials = page.getByText('Materiais', { exact: true }).first();
  }

  // ═══ ACTIONS ═══

  async switchToAvailable() {
    await this.availableTab.click();
  }

  async switchToInProgress() {
    await this.inProgressTab.click();
  }

  async switchToCompleted() {
    await this.completedTab.click();
  }

  async filterByAll() {
    await this.filterAll.click();
  }

  async filterByInvites() {
    await this.filterInvites.click();
  }

  async filterByEvents() {
    await this.filterEvents.click();
  }

  async filterByMaterials() {
    await this.filterMaterials.click();
  }

  async clickMission(title: string) {
    await this.page.getByText(title).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.availableTab).toBeVisible({ timeout: 15_000 });
    await expect(this.inProgressTab).toBeVisible();
    await expect(this.completedTab).toBeVisible();
  }

  async expectMissionCard(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectEmptyState(message: string) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 10_000 });
  }

  async expectFilterChipsVisible() {
    await expect(this.filterAll).toBeVisible();
  }

  async expectMissionsLoaded() {
    // Wait for at least one mission card to appear (or empty state)
    await expect(
      this.page.getByText('pts').first()
        .or(this.page.getByText('Nenhuma missão'))
    ).toBeVisible({ timeout: 15_000 });
  }
}
