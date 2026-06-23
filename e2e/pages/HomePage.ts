/**
 * ═══════════════════════════════════════════════════════════════
 *  Page Object — Home Page (Dashboard)
 *  Encapsula seletores e ações da tela Home após login.
 * ═══════════════════════════════════════════════════════════════
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;

  // ═══ LOCATORS ═══
  readonly greeting: Locator;
  readonly pointsStat: Locator;
  readonly missionsStat: Locator;
  readonly rankingStat: Locator;
  readonly badgesStat: Locator;
  readonly viewAllMissionsLink: Locator;
  readonly quickActionInvite: Locator;
  readonly quickActionMaterials: Locator;
  readonly quickActionNotifications: Locator;

  constructor(page: Page) {
    this.page = page;
    this.greeting = page.getByText('Olá,');
    this.pointsStat = page.locator('[aria-label="Stat: Pontos"]');
    this.missionsStat = page.locator('[aria-label="Stat: Missões"]');
    this.rankingStat = page.locator('[aria-label="Stat: Ranking"]');
    this.badgesStat = page.locator('[aria-label="Stat: Conquistas"]');
    this.viewAllMissionsLink = page.locator('[aria-label="Ver todas as missões"]');
    this.quickActionInvite = page.locator('[aria-label="Convidar"]');
    this.quickActionMaterials = page.locator('[aria-label="Materiais"]');
    this.quickActionNotifications = page.locator('[aria-label="Avisos"]');
  }

  // ═══ ASSERTIONS ═══

  async expectVisible() {
    await expect(this.greeting).toBeVisible({ timeout: 15_000 });
  }

  async expectGreetingWithName(firstName: string) {
    await expect(this.page.getByText(`Olá, ${firstName}!`)).toBeVisible({ timeout: 15_000 });
  }

  async expectStatsVisible() {
    // Use the aria-label on StatCard components
    await expect(this.page.getByRole('button', { name: 'Stat: Pontos' })).toBeVisible();
    await expect(this.page.getByText('Ações Rápidas', { exact: true })).toBeVisible();
  }

  async expectFeaturedMissionsSection() {
    await expect(this.page.getByText('Missões em Destaque')).toBeVisible();
  }

  async expectQuickActionsVisible() {
    await expect(this.page.getByText('Ações Rápidas')).toBeVisible();
  }

  async expectViewAllMissionsLink() {
    await expect(this.viewAllMissionsLink).toBeVisible();
  }

  async expectLevelJourneyVisible() {
    // Level journey shows "Faltam X pontos para Y" text
    await expect(
      this.page.getByText(/Faltam \d+ pontos para/)
    ).toBeVisible({ timeout: 10_000 });
  }
}
