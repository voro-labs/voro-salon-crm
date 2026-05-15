import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class EmployeesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/employees')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /funcionário|colaborador/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async clickFirstEmployee() {
    await this.page.getByRole('link').filter({ hasText: /ver|detalhe/i }).first().click()
  }

  async expectProfilePage() {
    await this.page.waitForURL(/\/employees\/[^/]+$/, { timeout: 10000 })
  }
}
