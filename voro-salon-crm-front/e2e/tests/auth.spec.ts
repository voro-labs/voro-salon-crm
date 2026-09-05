import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'

test.use({ storageState: { cookies: [], origins: [] } })

const email = process.env.TEST_EMAIL ?? ''
const password = process.env.TEST_PASSWORD ?? ''

test.describe('Autenticação', () => {
  test('login com credenciais válidas redireciona para área protegida', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, password)
    await loginPage.expectRedirectedAway()
    expect(page.url()).not.toContain('/admin/sign-in')
  })

  test('login com senha incorreta exibe erro', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(email, 'senha_errada_12345')
    await loginPage.expectError()
    expect(page.url()).toContain('/admin/sign-in')
  })

  test('acesso a rota protegida sem auth redireciona para sign-in', async ({ page }) => {
    await page.goto('/appointments')
    await page.waitForURL('**/admin/sign-in**', { timeout: 10000 })
    expect(page.url()).toContain('/admin/sign-in')
  })

  test('rota publica nao e redirecionada sem auth', async ({ page }) => {
    await page.goto('/prices')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/prices')
  })

  test('rota protegida de admin redireciona sem auth', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL('**/admin/sign-in**', { timeout: 10000 })
    expect(page.url()).toContain('/admin/sign-in')
  })
})
