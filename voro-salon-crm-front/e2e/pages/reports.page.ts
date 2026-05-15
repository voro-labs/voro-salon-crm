import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ReportsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/reports')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /relatório/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async expectNoServerError() {
    await expect(this.page.getByText(/500|erro interno/i)).not.toBeVisible()
  }
}
