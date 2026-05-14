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
      this.page.getByRole('heading', { name: /relatório/i }).or(
        this.page.getByText(/relatório/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async expectNoServerError() {
    await expect(this.page.getByText(/500|erro interno/i)).not.toBeVisible()
  }
}
