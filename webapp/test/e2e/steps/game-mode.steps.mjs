import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

// ---- Shared setup: login + navigate to game ----

Given('the user is logged in and on the game page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  // Mock the users API
  await page.route('**/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }),
    })
  })

  await page.route('**/createuser', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Hello TestUser! Welcome to the course!' }),
    })
  })

  // Mock the Rust game API (gateway forwards to gamey)
  await page.route('**/v1/game/play', async route => {
    const body = route.request().postDataJSON()
    const size = body?.yen?.size ?? 7
    // Return an ongoing game state
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

  await page.route('**/api/games', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1 }),
    })
  })

  // Navigate to app and log in
  await page.goto('http://localhost:5173')

  // If on landing page, click to get to login
  const playBtn = page.locator('button', { hasText: /play now|jugar/i }).first()
  if (await playBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await playBtn.click()
  }

  // Log in
  await page.fill('#username', 'TestUser')
  await page.fill('input[type="password"]', 'Password123')
  await page.click('.submit-button')

  // Wait for the game mode selector to appear
  await page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })
})

// ---- Mode selection ----

When('I select the {string} game mode', async function (mode) {
  const page = this.page
  const testId = mode === 'bot' ? 'mode-bot' : 'mode-multiplayer'
  await page.click(`[data-testid="${testId}"]`)
})

When('I click the start game button', async function () {
  const page = this.page
  await page.click('[data-testid="btn-start-game"]')
})

When('I increase the board size twice', async function () {
  const page = this.page
  await page.click('[data-testid="size-increase"]')
  await page.click('[data-testid="size-increase"]')
})

When('I choose that the bot starts first', async function () {
  const page = this.page
  await page.click('[data-testid="starts-bot"]')
})

// ---- Assertions ----

Then('I should see the bot game board', async function () {
  const page = this.page
  await page.waitForSelector('[data-testid="hex-board"]', { timeout: 8000 })
  const board = await page.$('[data-testid="hex-board"]')
  assert.ok(board, 'Expected to see the hex game board')
})

Then('I should see the multiplayer lobby', async function () {
  const page = this.page
  // The multiplayer lobby shows a "Connect" button
  await page.waitForSelector('[data-testid="btn-connect"]', { timeout: 8000 })
  const connectBtn = await page.$('[data-testid="btn-connect"]')
  assert.ok(connectBtn, 'Expected to see the multiplayer lobby connect button')
})
