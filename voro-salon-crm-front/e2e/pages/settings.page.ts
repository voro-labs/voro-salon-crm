import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /configura/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async gotoBusinessHours() {
    await this.page.goto('/settings/business-hours')
    await this.page.waitForLoadState('networkidle')
  }

  async expectBusinessHoursLoaded() {
    await expect(
      this.page.locator('h1, h2').filter({ hasText: /horário|funcionamento/i }).first()
    ).toBeVisible({ timeout: 10000 })
  }
}
