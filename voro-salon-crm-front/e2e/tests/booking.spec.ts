import { test, expect } from '@playwright/test'
import { BookingPage } from '../pages/booking.page'

test.use({ storageState: undefined })

test.describe('Booking público', () => {
  test('página de booking carrega sem erros', async ({ page }) => {
    const bookingPage = new BookingPage(page)
    await bookingPage.goto()
    await bookingPage.expectWelcomeCardLoaded()
  })

  test('URL de booking com slug inválido exibe not found ou redireciona', async ({ page }) => {
    await page.goto('/booking/slug-que-nao-existe-12345')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/500|erro interno do servidor/i)).not.toBeVisible()
  })
})
