import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class ClientsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/clients')
    await this.page.waitForLoadState('networkidle')
  }

  async expectPageLoaded() {
    await expect(
      this.page.locator('h1').filter({ hasText: /cliente/i })
    ).toBeVisible({ timeout: 10000 })
  }

  async clickNewClient() {
    await this.page.getByRole('button', { name: /novo cliente|adicionar cliente/i }).first().click()
  }

  async expectNewClientPage() {
    await this.page.waitForURL('**/clients/new**', { timeout: 10000 })
  }

  async fillNewClientForm(name: string, phone: string) {
    await this.page.getByLabel(/nome/i).fill(name)
    await this.page.getByLabel(/telefone|celular/i).fill(phone)
  }

  async submitNewClientForm() {
    await this.page.getByRole('button', { name: /salvar|criar|cadastrar/i }).click()
  }

  async expectClientCreated() {
    await this.page.waitForURL(/\/clients(?:\/[^/]+)?$/, { timeout: 15000 })
  }

  async searchClient(name: string) {
    const searchInput = this.page.getByPlaceholder(/buscar|pesquisar|procurar/i)
    await searchInput.fill(name)
    await this.page.waitForTimeout(500)
  }
}
