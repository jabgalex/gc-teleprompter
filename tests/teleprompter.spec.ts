import { devices, expect, test } from '@playwright/test'

test('modo diagnóstico muestra métricas solo con debug=1', async ({ page }) => {
  await page.goto('/?debug=1')
  await expect(page.getByTestId('debug-panel')).toBeVisible()
  await expect(page.getByText('scrollHeight:')).toBeVisible()
})

test('lector precede la edición en móvil y tablet', async ({ page }) => {
  for (const width of [320, 375, 380, 430, 768]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    const layout = await page.evaluate(() => {
      const settings = document.querySelector('.editor-panel')?.getBoundingClientRect()
      const reader = document.querySelector('.reader-panel')?.getBoundingClientRect()
      return { settingsTop: settings?.top ?? -1, readerTop: reader?.top ?? -1, overflowX: document.documentElement.scrollWidth > window.innerWidth }
    })
    expect(layout.readerTop, `reader top at ${width}px`).toBeLessThan(layout.settingsTop)
    expect(layout.overflowX, `horizontal overflow at ${width}px`).toBe(false)
  }
})

test('marcadores quedan visibles debajo del lector en portrait', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const script = Array.from({ length: 12 }, (_, index) => `Parte ${index + 1}: texto de prueba.`).join('\n\n')
  await page.locator('#script').fill(script)
  const reader = page.locator('.reader-panel')
  const markers = page.locator('.marker-panel')
  await expect(markers).toBeVisible()
  const layout = await reader.evaluate((element) => {
    const marker = document.querySelector('.marker-panel')?.getBoundingClientRect()
    const readerBox = element.getBoundingClientRect()
    return { readerBottom: readerBox.bottom, markerTop: marker?.top ?? -1, markerBottom: marker?.bottom ?? -1 }
  })
  expect(layout.markerTop).toBeGreaterThanOrEqual(layout.readerBottom)
  expect(await markers.locator('button').count()).toBe(12)
})

test('inicio táctil mueve el lector en móvil realista', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()
  await page.goto('/')
  const script = Array.from({ length: 60 }, (_, index) => `Parte ${index + 1}: texto largo para lectura.`).join('\n\n')
  await page.locator('#script').fill(script)
  const reader = page.locator('.reader-scroll')
  await page.getByRole('button', { name: '▶ Iniciar' }).tap()
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  await page.waitForTimeout(700)
  expect(await reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await context.close()
})

test('pointerdown táctil aislado no detiene la reproducción', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const script = Array.from({ length: 60 }, (_, index) => `Parte ${index + 1}: texto largo para lectura.`).join('\n\n')
  await page.locator('#script').fill(script)
  const reader = page.locator('.reader-scroll')
  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  await reader.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
    element.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 9, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
  })
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  const position = await reader.evaluate((element) => element.scrollTop)
  await page.waitForTimeout(350)
  expect(await reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(position)
})

test('el movimiento no depende exclusivamente de requestAnimationFrame', async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 0
  })
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const script = Array.from({ length: 60 }, (_, index) => `Parte ${index + 1}: texto largo para lectura.`).join('\n\n')
  await page.locator('#script').fill(script)
  const reader = page.locator('.reader-scroll')
  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  await page.waitForTimeout(350)
  expect(await reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})

test('acumula desplazamiento fraccional a velocidades menores de 2x', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const script = Array.from({ length: 100 }, (_, index) => `Parte ${index + 1}: texto largo para lectura lenta.`).join('\n\n')
  await page.locator('#script').fill(script)
  await page.locator('input[aria-label="Velocidad del teleprompter"]').fill('0.5')
  const reader = page.locator('.reader-scroll')
  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await expect(page.getByText('EN MARCHA')).toBeVisible()
  await page.waitForTimeout(900)
  expect(await reader.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
})


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
    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
    element.scrollTop = 400
    element.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 140, bubbles: true }))
    element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 140, bubbles: true }))
  })
  await expect(page.getByText('EN PAUSA')).toBeVisible()
  await expect.poll(() => reader.evaluate((element) => element.scrollTop)).toBe(400)

  await page.getByRole('button', { name: '▶ Iniciar' }).click()
  await page.waitForTimeout(500)
  const resumedPosition = await reader.evaluate((element) => element.scrollTop)
  expect(resumedPosition).toBeGreaterThan(400)
  await expect(page.getByText('EN MARCHA')).toBeVisible()

  await reader.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
    element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
  })
  await expect(page.getByText('EN PAUSA')).toBeVisible()

  await reader.evaluate((element) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
    element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, pointerType: 'touch', clientX: 100, clientY: 100, bubbles: true }))
  })
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
