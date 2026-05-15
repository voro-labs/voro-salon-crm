import { test } from '@playwright/test'
import { ReportsPage } from '../pages/reports.page'

test.describe('Relatórios', () => {
  test('página de relatórios carrega sem erros', async ({ page }) => {
    const reportsPage = new ReportsPage(page)
    await reportsPage.goto()
    await reportsPage.expectPageLoaded()
    await reportsPage.expectNoServerError()
  })
})
