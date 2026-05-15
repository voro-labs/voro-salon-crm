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

  // Aguarda redirect para fora do sign-in (login bem-sucedido)
  await page.waitForURL((url) => !url.pathname.includes('/admin/sign-in'), {
    timeout: 15000,
  })

  await page.context().storageState({ path: authFile })
})
