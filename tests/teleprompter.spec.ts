import { expect, test } from '@playwright/test'

test('teleprompter mantiene la posición al pausar, mover y reanudar', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 })
  await page.goto('/')

  const script = Array.from({ length: 40 }, (_, index) => `Parte ${index + 1}: texto de prueba para lectura continua.`).join('\n\n')
  await page.locator('#script').fill(script)

  const reader = page.locator('.reader-scroll')
  await expect(reader).toBeVisible()
  await expect(page.getByRole('button', { name: /Parte 1:/ })).toBeVisible()
  await expect(page.locator('input[aria-label="Posición del teleprompter"]')).toBeVisible()
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll')

  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await page.waitForTimeout(500)
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  const firstPosition = await reader.evaluate((element) => element.scrollTop)
  expect(firstPosition).toBeGreaterThan(0)

  await page.getByRole('button', { name: '■ Pausar' }).click()
  await reader.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    element.scrollTop = 400
  })
  await expect(page.getByText('EN PAUSA')).toBeVisible()
  await expect.poll(() => reader.evaluate((element) => element.scrollTop)).toBe(400)

  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await page.waitForTimeout(500)
  const resumedPosition = await reader.evaluate((element) => element.scrollTop)
  expect(resumedPosition).toBeGreaterThan(400)
  await expect(page.getByText('EN MARCHA')).toBeVisible()
})

test('guion corto mantiene la posición dentro de los límites', async ({ page }) => {
  await page.goto('/')
  await page.locator('#script').fill('Texto corto de prueba.')
  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await page.waitForTimeout(250)
  const reader = page.locator('.reader-scroll')
  const bounds = await reader.evaluate((element) => ({ top: element.scrollTop, max: element.scrollHeight - element.clientHeight }))
  expect(bounds.top).toBeGreaterThanOrEqual(0)
  expect(bounds.top).toBeLessThanOrEqual(Math.max(0, bounds.max))
})
