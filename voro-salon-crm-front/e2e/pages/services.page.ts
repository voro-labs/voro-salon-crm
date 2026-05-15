import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ServicesPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/services')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /serviço/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewService() {
    await this.page.getByRole('link', { name: /novo|criar|adicionar/i }).first().click()
  }

  async expectNewServicePage() {
    await this.page.waitForURL('**/services/new**', { timeout: 10000 })
  }

  async fillNewServiceForm(name: string, price: string, durationMinutes: string) {
    await this.page.getByLabel(/nome/i).fill(name)
    await this.page.getByLabel(/preço|valor/i).fill(price)
    await this.page.getByLabel(/duração/i).fill(durationMinutes)
  }

  async submitNewServiceForm() {
    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
  }
}
