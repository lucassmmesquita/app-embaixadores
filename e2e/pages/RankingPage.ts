/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Ranking Page (Leaderboard)
 *  Encapsula seletores e ações da tela de Ranking.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class RankingPage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly myPositionCard: Locator;
  readonly filterTop10: Locator;
  readonly filterTop50: Locator;
  readonly filterAll: Locator;
  readonly podiumSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myPositionCard = page.getByText('Sua posição');
    this.filterTop10 = page.locator('[aria-label="Top 10"]');
    this.filterTop50 = page.locator('[aria-label="Top 50"]');
    this.filterAll = page.locator('[aria-label="Todos"]');
    this.podiumSection = page.getByText('🏆 Pódio');
  }

  // ═══ ACTIONS ═══

  async selectTop10() {
    await this.filterTop10.click();
  }

  async selectTop50() {
    await this.filterTop50.click();
  }

  async selectAll() {
    await this.filterAll.click();
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.myPositionCard).toBeVisible({ timeout: 15_000 });
  }

  async expectMyPosition() {
    await expect(this.myPositionCard).toBeVisible();
    // Position number should be visible (# followed by number)
    await expect(this.page.getByText('pontos').first()).toBeVisible();
  }

  async expectFiltersVisible() {
    await expect(this.filterTop10).toBeVisible();
    await expect(this.filterTop50).toBeVisible();
    await expect(this.filterAll).toBeVisible();
  }

  async expectPodiumVisible() {
    await expect(this.podiumSection).toBeVisible({ timeout: 10_000 });
  }

  async expectLeaderboardLoaded() {
    // Either podium or empty state should be visible
    await expect(
      this.podiumSection
        .or(this.page.getByText('Ranking vazio'))
    ).toBeVisible({ timeout: 15_000 });
  }
}
