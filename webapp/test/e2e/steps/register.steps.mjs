import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.route('**/createuser', async route => {
    const body = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: `Hello ${body.username}! welcome to the course!` })
    })
  })

  await page.route('**/login', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ userId: 1, token: 'fake-token' })
    })
  })

  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')

  // Si hay landing page, esperar a que aparezca el botón Register here
  await page.waitForSelector('button:has-text("Jugar ahora")', { timeout: 10000 })
  await page.click('button:has-text("Jugar ahora")')
})

When('I enter {string} as the username and submit', async function (username) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('#username', { timeout: 5000 })
  await page.fill('#username', username)
  await page.fill('input[type="password"]', 'Password123')
  await page.click('.submit-button')
})

// Then('I should see a welcome message containing {string}', async function (expected) {
//   const page = this.page
//   if (!page) throw new Error('Page not initialized')
//   await page.waitForSelector('.success-message', { timeout: 5000 })
//   const text = await page.textContent('.success-message')
//   assert.ok(text && text.includes(expected), `Expected success message to include "${expected}", got: "${text}"`)
// })
