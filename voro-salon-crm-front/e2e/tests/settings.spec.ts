import { test } from '@playwright/test'
import { SettingsPage } from '../pages/settings.page'

test.describe('Configurações', () => {
  test('página de configurações carrega corretamente', async ({ page }) => {
    const settingsPage = new SettingsPage(page)
    await settingsPage.goto()
    await settingsPage.expectPageLoaded()
  })

  test('página de horários de funcionamento carrega', async ({ page }) => {
    const settingsPage = new SettingsPage(page)
    await settingsPage.gotoBusinessHours()
    await settingsPage.expectBusinessHoursLoaded()
  })
})
