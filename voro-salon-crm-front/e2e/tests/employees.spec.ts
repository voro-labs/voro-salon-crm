import { test, expect } from '@playwright/test'
import { EmployeesPage } from '../pages/employees.page'

test.describe('Funcionários', () => {
  test('página de funcionários carrega corretamente', async ({ page }) => {
    const employeesPage = new EmployeesPage(page)
    await employeesPage.goto()
    await employeesPage.expectPageLoaded()
  })

  test('página de funcionários não exibe erro 500', async ({ page }) => {
    await page.goto('/employees')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/500|erro interno/i)).not.toBeVisible()
  })
})
