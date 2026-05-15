import { test, expect } from '@playwright/test'
import { AppointmentsPage } from '../pages/appointments.page'

test.describe('Agendamentos', () => {
  test('página de agendamentos carrega corretamente', async ({ page }) => {
    const apptPage = new AppointmentsPage(page)
    await apptPage.goto()
    await apptPage.expectPageLoaded()
  })

  test('botão de novo agendamento navega para /appointments/new', async ({ page }) => {
    const apptPage = new AppointmentsPage(page)
    await apptPage.goto()
    await apptPage.expectPageLoaded()
    await apptPage.clickNewAppointment()
    await apptPage.expectNewAppointmentPage()
  })

  test('página de novo agendamento carrega', async ({ page }) => {
    await page.goto('/appointments/new')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
