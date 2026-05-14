import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class AppointmentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/appointments')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.getByRole('heading', { name: /agendamento/i }).or(
        this.page.getByText(/agendamento/i).first()
      )
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewAppointment() {
    await this.page.getByRole('link', { name: /novo|criar|adicionar/i }).first().click()
  }

  async expectNewAppointmentPage() {
    await this.page.waitForURL('**/appointments/new**', { timeout: 10000 })
  }

  async expectListNotEmpty() {
    await this.page.waitForSelector('[class*="skeleton"]', { state: 'detached', timeout: 10000 }).catch(() => {})
    const items = this.page.locator('[class*="card"]').or(this.page.getByRole('listitem'))
    await expect(items.first()).toBeVisible({ timeout: 10000 })
  }
}
