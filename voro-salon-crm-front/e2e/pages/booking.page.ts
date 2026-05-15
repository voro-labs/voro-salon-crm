import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class BookingPage {
  private slug: string

  constructor(private page: Page) {
    this.slug = process.env.BOOKING_SLUG ?? 'test-salon'
  }

  async goto() {
    await this.page.goto(`/booking/${this.slug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async expectWelcomeCardLoaded() {
    await expect(this.page.locator('body')).not.toBeEmpty()
    await expect(this.page.getByText(/internal server error|not found|página não encontrada/i)).not.toBeVisible()
  }

  async selectFirstService() {
    const firstService = this.page.getByRole('button').filter({ hasText: /selecionar|escolher/i }).first()
    const firstCard = this.page.locator('[class*="card"]').first()
    const target = await firstService.isVisible() ? firstService : firstCard
    await target.click()
  }

  async expectProfessionalStep() {
    await expect(
      this.page.getByText(/profissional|colaborador/i).first()
    ).toBeVisible({ timeout: 10000 })
  }
}
