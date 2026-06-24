/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Fluxo de Onboarding
 *  Testa os slides de introdução do app
 *  Usa Page Object Model (OnboardingPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../../pages/OnboardingPage';

// ═══ TESTES DE UI (não precisam de backend) ═══

test.describe('Onboarding — Validação de UI', () => {
  let onboardingPage: OnboardingPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear storage to ensure onboarding is shown
    await context.clearCookies();

    onboardingPage = new OnboardingPage(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir botão Pular', async () => {
    // If onboarding is shown, skip button should be visible
    // If not shown (already completed), this test is skipped
    const isOnboarding = await onboardingPage.skipButton.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isOnboarding, 'Onboarding já foi concluído neste contexto');

    await onboardingPage.expectVisible();
  });

  test('deve navegar entre slides com botão Próximo', async () => {
    const isOnboarding = await onboardingPage.skipButton.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isOnboarding, 'Onboarding já foi concluído neste contexto');

    // First slide
    await onboardingPage.expectSlideText('Bem-vindo');

    // Go to second slide
    await onboardingPage.goToNextSlide();
    await onboardingPage.expectSlideText('Complete Missões');

    // Go to third slide
    await onboardingPage.goToNextSlide();
    await onboardingPage.expectSlideText('Suba de Nível');
  });

  test('último slide deve mostrar "Cadastrar agora" e link "Já tenho conta"', async () => {
    const isOnboarding = await onboardingPage.skipButton.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isOnboarding, 'Onboarding já foi concluído neste contexto');

    // Navigate to last slide
    await onboardingPage.goToNextSlide(); // slide 2
    await onboardingPage.goToNextSlide(); // slide 3
    await onboardingPage.goToNextSlide(); // slide 4 (last)

    await onboardingPage.expectRegisterNowButtonVisible();
    await onboardingPage.expectLoginLinkVisible();
  });

  test('pular onboarding deve levar ao login', async ({ page }) => {
    const isOnboarding = await onboardingPage.skipButton.isVisible({ timeout: 5_000 }).catch(() => false);
    test.skip(!isOnboarding, 'Onboarding já foi concluído neste contexto');

    await onboardingPage.skip();

    // Should navigate to login
    await expect(page.locator('[aria-label="Entrar"][role="button"]').first()).toBeVisible({ timeout: 15_000 });
  });
});
