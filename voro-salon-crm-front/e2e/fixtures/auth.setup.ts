import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('autenticar usuário de teste', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD

  if (!email || !password) {
    throw new Error('TEST_EMAIL e TEST_PASSWORD devem estar definidos')
  }

  await page.goto('/admin/sign-in')

  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^senha$/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Aguarda redirect ou mensagem de erro para falhar rápido com diagnóstico
  const redirected = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.includes('/admin/sign-in'), { timeout: 30000 })
      .then(() => true),
    page
      .locator('[class*="destructive"] p, [role="alert"]')
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => false),
  ]).catch(() => false)

  if (!redirected) {
    const errorEl = page
      .locator('[class*="destructive"] p, [role="alert"]')
      .first()
    const errorText = await errorEl.textContent().catch(() => '')
    const currentUrl = page.url()
    throw new Error(
      `Login não redirecionou (URL atual: ${currentUrl}). ` +
        `Mensagem na página: "${errorText || 'nenhuma mensagem de erro visível'}". ` +
        `Verifique NEXT_PUBLIC_API_URL, TEST_EMAIL e TEST_PASSWORD.`
    )
  }

  await page.context().storageState({ path: authFile })
})
