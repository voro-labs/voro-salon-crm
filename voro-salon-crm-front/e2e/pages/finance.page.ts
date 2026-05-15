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
      this.page.locator('h1').filter({ hasText: /financ/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async gotoCategories() {
    await this.page.goto('/finance/categories')
    await this.page.waitForLoadState('networkidle')
  }

  async expectCategoriesPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /categor/i })
    ).toBeVisible({ timeout: 10000 })
  }
}
