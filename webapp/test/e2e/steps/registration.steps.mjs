/**
 * registration.steps.mjs
 *
 * Step definitions for registration.feature.
 *
 * IMPORTANTE — pasos que NO están aquí porque ya existen en otros archivos:
 *   - 'the register page is open'          → register.steps.mjs
 *   - 'I enter {string} as the username…'  → register.steps.mjs
 *   - 'I should see the game mode selector'→ bot-game.steps.mjs
 *
 * Este archivo solo añade los pasos nuevos que no existen en ningún otro sitio.
 */

import { Given, Then } from '@cucumber/cucumber'
import assert from 'assert'

// ─────────────────────────────────────────────────────────────────────────────
// Given
// ─────────────────────────────────────────────────────────────────────────────

Given('the app is open at the home page', async function () {
  const { page } = this

  await page.route('**/login', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }) }))

  await page.route('**/createuser', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ message: 'Hello TestUser! welcome to the course!' }) }))

  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')

  const playBtn = page.locator('button', { hasText: /play now|jugar ahora/i }).first()
  if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playBtn.click()
  }

  await page.waitForSelector('#username', { timeout: 10000 })
})

Given('the app is open at the home page with a failing login', async function () {
  const { page } = this

  await page.route('**/login', route =>
    route.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ error: 'Invalid credentials' }) }))

  await page.route('**/createuser', route =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ message: 'Hello WrongUser! welcome to the course!' }) }))

  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')

  const playBtn = page.locator('button', { hasText: /play now|jugar ahora/i }).first()
  if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playBtn.click()
  }

  await page.waitForSelector('#username', { timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Then — pasos nuevos (no presentes en ningún otro archivo de steps)
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see the username input field', async function () {
  const input = await this.page.$('#username')
  assert.ok(input, 'Expected #username input to be visible')
})

Then('I should see the password input field', async function () {
  const input = await this.page.$('input[type="password"]')
  assert.ok(input, 'Expected password input to be visible')
})

Then('I should see the submit button', async function () {
  const btn = await this.page.$('.submit-button')
  assert.ok(btn, 'Expected .submit-button to be visible')
})

Then('I should see an error message on the login form', async function () {
  const { page } = this
  await page.waitForSelector(
    '[class*="error"], [data-testid*="error"], [role="alert"]',
    { timeout: 6000 },
  )
  const errEl = await page.$('[class*="error"], [data-testid*="error"], [role="alert"]')
  assert.ok(errEl, 'Expected an error message after failed login')
})
