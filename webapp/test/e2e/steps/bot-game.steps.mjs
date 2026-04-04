import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'
import { loginAndNavigate } from './game-mode.steps.mjs'

// ---- Given: user is already in a bot game ----

Given('the user is in a bot game with size {int}', async function (size) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.route('**/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }),
    })
  })

  await page.route('**/api/games', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1 }),
    })
  })

  await page.route('**/v1/game/play', async route => {
    const layout = Array.from({ length: size }, (_, i) => '.'.repeat(i + 1)).join('/')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        yen: { size, turn: 1, players: ['B', 'R'], layout },
        status: 'Ongoing',
      }),
    })
  })

  await page.route('**/v1/ybot/choose/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ api_version: 'v1', bot_id: 'random_bot', coords: { x: 0, y: 0, z: 0 } }),
    })
  })

  await loginAndNavigate(page)

  // Start bot game (default mode is already bot)
  await page.click('[data-testid="btn-start-game"]')
  await page.waitForSelector('[data-testid="hex-board"]', { timeout: 8000 })
})

// ---- When ----

When('I click on an empty cell', async function () {
  const page = this.page
  const cell = page.locator('[data-testid="hex-board"] [role="button"]').first()
  await cell.waitFor({ timeout: 5000 })
  await cell.click()
})

When('the game API returns a finished state with player winning', async function () {
  const page = this.page
  const size = 5
  const winLayout = 'B/BB/BBB/BBBB/BBBBB'

  await page.route('**/v1/game/play', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        yen: { size, turn: 0, players: ['B', 'R'], layout: winLayout },
        status: 'Finished',
        winner: 0,
      }),
    })
  })
})

When('I click the back to menu button', async function () {
  const page = this.page
  await page.click('[data-testid="btn-back"]')
})

// ---- Then ----

Then('the board should be updated', async function () {
  const page = this.page
  await page.waitForSelector('[data-testid="hex-board"]', { timeout: 5000 })
  const board = await page.$('[data-testid="hex-board"]')
  assert.ok(board, 'Board should still be visible after a move')
})

Then('I should see the victory message', async function () {
  const page = this.page
  const cell = page.locator('[data-testid="hex-board"] [role="button"]').first()
  if (await cell.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cell.click()
  }
  await page.waitForSelector('[data-testid="bot-game-status"]', { timeout: 5000 })
  const statusText = await page.textContent('[data-testid="bot-game-status"]')
  assert.ok(
    statusText && (statusText.includes('ganado') || statusText.includes('won') || statusText.includes('Has')),
    `Expected victory message, got: "${statusText}"`
  )
})

Then('I should see the game mode selector', async function () {
  const page = this.page
  await page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })
  const selector = await page.$('[data-testid="btn-start-game"]')
  assert.ok(selector, 'Expected to see the game mode selector')
})
