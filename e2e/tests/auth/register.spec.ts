/**
 * ═══════════════════════════════════════════════════════════════
 *  E2E Test — Fluxo de Cadastro (Register)
 *  Testa criação de conta via formulário de email/senha
 *  Usa Page Object Model (RegisterPage)
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage';
import { generateTestUser, setupApiRoute } from '../../fixtures/helpers';

// ═══ TESTES DE UI (não precisam de backend) ═══

test.describe('Cadastro — Validação de UI', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('deve exibir todos os campos do formulário', async () => {
    await registerPage.expectVisible();
  });

  test('deve mostrar erros de validação ao submeter formulário vazio', async () => {
    await registerPage.acceptDataProcessing();
    await registerPage.submit();

    await registerPage.expectValidationError('Nome é obrigatório');
    await registerPage.expectValidationError('E-mail é obrigatório');
    await registerPage.expectValidationError('Senha é obrigatória');
  });

  test('deve validar email inválido', async () => {
    await registerPage.fillEmail('email-invalido');
    await registerPage.fillName(''); // trigger blur

    await registerPage.expectValidationError('E-mail inválido');
  });

  test('deve validar nome incompleto (sem sobrenome)', async () => {
    await registerPage.fillName('Maria');
    await registerPage.fillEmail(''); // trigger blur

    await registerPage.expectValidationError('Informe o nome completo');
  });

  test('deve validar senha curta', async () => {
    await registerPage.fillPassword('123');
    await registerPage.fillName(''); // trigger blur

    await registerPage.expectValidationError('Mínimo de 6 caracteres');
  });

  test('deve validar senhas que não coincidem', async () => {
    await registerPage.fillPassword('Teste@123');
    await registerPage.fillConfirmPassword('Teste@456');
    await registerPage.fillName(''); // trigger blur

    await registerPage.expectValidationError('As senhas não coincidem');
  });

  test('deve mostrar indicador de força da senha', async () => {
    await registerPage.fillPassword('abcdef');
    await registerPage.expectPasswordStrength('Fraca');

    await registerPage.fillPassword('Teste@123!');
    await expect(
      registerPage.page.getByText('Forte').or(registerPage.page.getByText('Excelente'))
    ).toBeVisible();
  });

  test('botão "Criar Conta" deve estar desabilitado sem consentimento de dados', async () => {
    const user = generateTestUser();
    await registerPage.fillName(user.fullName);
    await registerPage.fillEmail(user.email);
    await registerPage.fillPassword(user.password);
    await registerPage.fillConfirmPassword(user.password);

    // NÃO marca consentimento
    await registerPage.expectSubmitDisabled();
  });

  test('deve ter link para voltar à tela de login', async ({ page }) => {
    await expect(registerPage.page.getByText('Já tem conta?')).toBeVisible();
    await registerPage.goToLogin();

    // Verifica URL pois Expo Router mantém ambas telas no DOM
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });
});

// ═══ TESTES COM API (precisam de backend rodando) ═══

test.describe('Cadastro — Com backend', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    await setupApiRoute(page);
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('deve cadastrar com sucesso e redirecionar para login', async ({ page }) => {
    const user = generateTestUser();

    await registerPage.register({
      fullName: user.fullName,
      email: user.email,
      phone: '11999990000',
      password: user.password,
      acceptComm: true,
    });

    await registerPage.expectRegistrationSuccess();

    // Deve redirecionar para tela de login
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });

  test('deve rejeitar cadastro com email duplicado', async ({ page }) => {
    const user = generateTestUser();

    // Primeiro cadastro — sucesso
    await registerPage.register({
      fullName: user.fullName,
      email: user.email,
      password: user.password,
    });
    await registerPage.expectRegistrationSuccess();

    // Segundo cadastro com mesmo email
    const registerPage2 = new RegisterPage(page);
    await registerPage2.goto();

    await registerPage2.register({
      fullName: 'Outro Nome Teste',
      email: user.email,
      password: user.password,
    });

    await registerPage2.expectRegistrationError();
  });
});
