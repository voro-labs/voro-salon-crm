import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class FinancePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/finance')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /financ/i }).or(
        this.page.getByText(/financ/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async gotoCategories() {
    await this.page.goto('/finance/categories')
    await this.page.waitForLoadState('networkidle')
  }

  async expectCategoriesPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /categor/i }).or(
        this.page.getByText(/categor/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }
}
