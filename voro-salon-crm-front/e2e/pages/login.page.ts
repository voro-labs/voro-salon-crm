import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/admin/sign-in')
  }

  async fillEmail(email: string) {
    await this.page.getByLabel(/^email$/i).fill(email)
  }

  async fillPassword(password: string) {
    await this.page.getByLabel(/^senha$/i).fill(password)
  }

  async submit() {
    await this.page.getByRole('button', { name: /entrar/i }).click()
  }

  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  async expectError() {
    await expect(
      this.page.getByRole('alert').or(this.page.getByText(/credenciais|inválid|incorret/i))
    ).toBeVisible({ timeout: 5000 })
  }

  async expectRedirectedAway() {
    await this.page.waitForURL(
      (url) => !url.pathname.includes('/admin/sign-in'),
      { timeout: 15000 }
    )
  }
}
