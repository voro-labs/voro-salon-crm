import { test } from '@playwright/test'
import { FinancePage } from '../pages/finance.page'

test.describe('Finanças', () => {
  test('página de finanças carrega corretamente', async ({ page }) => {
    const financePage = new FinancePage(page)
    await financePage.goto()
    await financePage.expectPageLoaded()
  })

  test('página de categorias carrega corretamente', async ({ page }) => {
    const financePage = new FinancePage(page)
    await financePage.gotoCategories()
    await financePage.expectCategoriesPageLoaded()
  })
})
