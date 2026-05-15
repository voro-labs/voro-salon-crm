import { test, expect } from '@playwright/test'
import { ServicesPage } from '../pages/services.page'

test.describe('Serviços', () => {
  test('página de serviços carrega corretamente', async ({ page }) => {
    const servicesPage = new ServicesPage(page)
    await servicesPage.goto()
    await servicesPage.expectPageLoaded()
  })

  test('botão de novo serviço navega para /services/new', async ({ page }) => {
    const servicesPage = new ServicesPage(page)
    await servicesPage.goto()
    await servicesPage.expectPageLoaded()
    await servicesPage.clickNewService()
    await servicesPage.expectNewServicePage()
  })

  test('formulário de novo serviço renderiza os campos obrigatórios', async ({ page }) => {
    await page.goto('/services/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/nome/i)).toBeVisible({ timeout: 10000 })
  })
})
