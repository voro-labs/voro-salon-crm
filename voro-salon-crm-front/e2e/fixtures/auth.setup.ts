import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

setup('autenticar usuário de teste', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  const twoFaCode = process.env.TEST_2FA_CODE

  if (!email || !password) {
    throw new Error('TEST_EMAIL e TEST_PASSWORD devem estar definidos')
  }
  if (!twoFaCode || twoFaCode.length !== 6) {
    throw new Error('TEST_2FA_CODE deve ser um código de 6 dígitos')
  }

  await page.goto('/admin/sign-in')

  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^senha$/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Aguarda navegação para a página de verificação 2FA
  await page.waitForURL('**/admin/verify-2fa**', { timeout: 15000 }).catch(async () => {
    const currentUrl = page.url()
    const errorEl = page.locator('[class*="destructive"] p, [role="alert"]').first()
    const errorText = await errorEl.textContent().catch(() => '')
    throw new Error(
      `Login não redirecionou para verify-2fa (URL atual: ${currentUrl}). ` +
        `Mensagem na página: "${errorText || 'nenhuma'}". ` +
        `Verifique NEXT_PUBLIC_API_URL, TEST_EMAIL e TEST_PASSWORD.`
    )
  })

  // Preenche os 6 campos de dígito individualmente
  const digitInputs = page.locator('input[inputmode="numeric"]')
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill(twoFaCode[i])
  }

  // A página auto-submete ao preencher o 6º dígito; aguarda redirect
  await page.waitForURL((url) => !url.pathname.includes('/admin/verify-2fa'), {
    timeout: 30000,
  }).catch(async () => {
    const errorEl = page.locator('[class*="destructive"] p, [role="alert"]').first()
    const errorText = await errorEl.textContent().catch(() => '')
    throw new Error(
      `Código 2FA não foi aceito. ` +
        `Mensagem na página: "${errorText || 'nenhuma'}". ` +
        `Verifique TEST_2FA_CODE.`
    )
  })

  await page.context().storageState({ path: authFile })
})
