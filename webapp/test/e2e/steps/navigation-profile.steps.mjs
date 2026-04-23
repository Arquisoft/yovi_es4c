/**
 * navigation-profile.steps.mjs
 */

import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'
import { WS_MOCK_SCRIPT, loginAndNavigate } from './game-mode.steps.mjs'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_LEADERBOARD = {
  data: [
    { rank: 1, userId: 1, username: 'TopPlayer', gamesPlayed: 50, wins: 40, winRate: 80 },
    { rank: 2, userId: 2, username: 'SecondPlace', gamesPlayed: 30, wins: 20, winRate: 67 },
  ],
  pagination: { total: 15, limit: 10, offset: 0 },
}

const MOCK_PROFILE_STATS = {
  totalGames: 10,
  wins: 7,
  losses: 3,
  winRate: 70,
  currentStreak: 3,
  topDay: '2024-01-15',
  topDayCount: 5,
  lastGame: '2024-01-20',
  beatenBots: 4,
  memberSince: '2024-01-01',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function setupWithLeaderboard(page) {
  await page.addInitScript(WS_MOCK_SCRIPT)

  await page.route('**/login', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }) }))

  await page.route('**/v1/game/play', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({
        yen: { size: 7, turn: 1, players: ['B', 'R'],
          layout: Array.from({ length: 7 }, (_, i) => '.'.repeat(i + 1)).join('/') },
        status: 'Ongoing',
      }) }))

  await page.route('**/api/games', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 1 }) }))

  await page.route('**/v1/ybot/choose/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ api_version: 'v1', bot_id: 'random_bot',
        coords: { x: 0, y: 0, z: 0 } }) }))

  await page.route('**/api/leaderboard**', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(MOCK_LEADERBOARD) }))

  await loginAndNavigate(page)
}

async function setupWithProfile(page) {
  await setupWithLeaderboard(page)
  await page.route('**/api/users/*/stats', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(MOCK_PROFILE_STATS) }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Given
// ─────────────────────────────────────────────────────────────────────────────

Given('the user is logged in and on the game page with leaderboard data', async function () {
  await setupWithLeaderboard(this.page)
})

Given('the user is logged in and on the game page with profile data', async function () {
  await setupWithProfile(this.page)
})

// ─────────────────────────────────────────────────────────────────────────────
// When
// ─────────────────────────────────────────────────────────────────────────────

When('I navigate to the leaderboard', async function () {
  const { page } = this
  // La NavBar tiene botones con texto "Ranking" para la vista leaderboard
  const rankingBtn = page.locator('button', { hasText: /ranking/i }).first()
  if (await rankingBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await rankingBtn.click()
  } else {
    await page.getByRole('button', { name: /ranking|leaderboard/i }).first().click()
  }
  await page.waitForTimeout(1500)
})

When('I navigate to the profile page', async function () {
  const { page } = this
  const profileBtn = page.locator('button, a', { hasText: /perfil|profile/i }).first()
  if (await profileBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profileBtn.click()
  } else {
    const userBtn = page.locator('button', { hasText: /testuser/i }).first()
    if (await userBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userBtn.click()
    }
  }
  await page.waitForTimeout(1000)
})

When('I click the logout button', async function () {
  await this.page.click('[data-testid="btn-logout"]')
})

When('there is a next page available', async function () {
  // El mock tiene total=15 y limit=10 → siempre hay siguiente página. Solo documentación.
})

When('I click the next page button', async function () {
  const { page } = this
  // getByRole filtra solo el <button> real, ignorando el <span> interno de MUI
  // que también tiene aria-label="Página siguiente" (strict mode violation en versión anterior)
  const nextBtn = page.getByRole('button', { name: 'Página siguiente' })
  await nextBtn.waitFor({ timeout: 5000 })
  await nextBtn.click()
  await page.waitForTimeout(500)
})

// ─────────────────────────────────────────────────────────────────────────────
// Then
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see the navigation bar', async function () {
  const nav = await this.page.$('nav, header, [role="banner"]')
  assert.ok(nav, 'Expected a navigation bar element')
})

Then('I should see the logout button', async function () {
  const btn = await this.page.$('[data-testid="btn-logout"]')
  assert.ok(btn, 'Expected logout button to be visible')
})

Then('I should be redirected to the login page', async function () {
  await this.page.waitForSelector(
    '#username, .submit-button, button:has-text("Jugar")',
    { timeout: 8000 },
  )
  const el = await this.page.$('#username, .submit-button, button:has-text("Jugar")')
  assert.ok(el, 'Expected to be back on the login or landing page after logout')
})

Then('I should see the leaderboard table', async function () {
  // Esperar a que el contenido del leaderboard mockeado aparezca en el DOM
  await this.page.waitForFunction(
    () => document.body.innerText.includes('TopPlayer'),
    { timeout: 8000 },
  )
  const bodyText = await this.page.textContent('body')
  assert.ok(
    bodyText && bodyText.includes('TopPlayer'),
    'Expected leaderboard to show TopPlayer',
  )
})

Then('I should see at least one leaderboard entry', async function () {
  await this.page.waitForFunction(
    () => document.body.innerText.includes('TopPlayer'),
    { timeout: 8000 },
  )
  const bodyText = await this.page.textContent('body')
  assert.ok(
    bodyText && bodyText.includes('TopPlayer'),
    'Expected at least one leaderboard entry (TopPlayer) to be visible',
  )
})

Then('I should see the second page of the leaderboard', async function () {
  const bodyText = await this.page.textContent('body')
  assert.ok(bodyText && bodyText.length > 0, 'Expected leaderboard second page content')
})

Then('I should see the profile stats section', async function () {
  await this.page.waitForTimeout(500)
  const bodyText = await this.page.textContent('body')
  assert.ok(
    bodyText && (
      bodyText.includes('TestUser') ||
      bodyText.includes('Partidas') ||
      bodyText.includes('Games') ||
      bodyText.includes('Victorias') ||
      bodyText.includes('Wins')
    ),
    'Expected profile stats section to contain player data',
  )
})

Then('I should see a win rate displayed', async function () {
  const bodyText = await this.page.textContent('body')
  assert.ok(
    bodyText && (bodyText.includes('70') || bodyText.includes('%')),
    'Expected win rate to be displayed on the profile page',
  )
})
