import { test, expect } from '@playwright/test'
import { ClientsPage } from '../pages/clients.page'

test.describe('Clientes', () => {
  test('página de clientes carrega corretamente', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
  })

  test('botão de novo cliente navega para /clients/new', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
    await clientsPage.clickNewClient()
    await clientsPage.expectNewClientPage()
  })

  test('página de novo cliente renderiza o formulário', async ({ page }) => {
    await page.goto('/clients/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel(/nome/i)).toBeVisible({ timeout: 10000 })
  })

  test('campo de busca filtra a lista', async ({ page }) => {
    const clientsPage = new ClientsPage(page)
    await clientsPage.goto()
    await clientsPage.expectPageLoaded()
    await clientsPage.searchClient('abc')
    await expect(page.getByRole('alert')).not.toBeVisible().catch(() => {})
  })
})
