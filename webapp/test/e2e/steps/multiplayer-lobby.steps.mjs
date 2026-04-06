// import { Given, When, Then } from '@cucumber/cucumber'
// import assert from 'assert'
// import { WS_MOCK_SCRIPT, loginAndNavigate } from './game-mode.steps.mjs'

// async function loginAndGoToMpLobby(page) {
//   await page.addInitScript(WS_MOCK_SCRIPT)

//   await page.route('**/login', async route => {
//     await route.fulfill({ status: 200, contentType: 'application/json',
//       body: JSON.stringify({ userId: 1 }) })
//   })
//   await page.route('**/v1/game/play', async route => {
//     await route.fulfill({ status: 200, contentType: 'application/json',
//       body: JSON.stringify({ yen: { size: 7, turn: 1, players: ['B','R'], layout: Array.from({length:7},(_,i)=>'.'.repeat(i+1)).join('/') }, status: 'Ongoing' }) })
//   })
//   await page.route('**/api/games', async route => {
//     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1 }) })
//   })

//   await loginAndNavigate(page)

//   // Seleccionar modo multijugador y arrancar
//   await page.click('[data-testid="mode-multiplayer"]')
//   await page.click('[data-testid="btn-start-game"]')
//   // El lobby aparece (estado idle → tabs Crear/Unirse)
//   await page.waitForSelector('[data-testid="tab-create"]', { timeout: 6000 })
// }

// // ---- Given ----

// Given('the user is in the multiplayer lobby with an active connection', async function () {
//   const page = this.page
//   if (!page) throw new Error('Page not initialized')
//   await loginAndGoToMpLobby(page)
//   // Crear sala para tener conexión activa + chat visible
//   await page.click('[data-testid="btn-create-room"]')
//   await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
// })

// // ---- When ----

// When('the WebSocket server creates a room', async function () {
//   const page = this.page
//   // El mock responde automáticamente a 'create'; sólo esperamos el código
//   await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 5000 })
// })

// When('I type {string} in the chat', async function (message) {
//   const page = this.page
//   await page.fill('[data-testid="lobby-chat-input"]', message)
// })

// When('I send the chat message', async function () {
//   const page = this.page
//   await page.click('[data-testid="lobby-chat-send"]')
// })

// // ---- Then ----

// Then('I should see the room ID displayed', async function () {
//   const page = this.page
//   await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
//   const code = await page.textContent('[data-testid="room-code-display"]')
//   assert.ok(code && code.trim().length > 0, `Expected a room code, got: "${code}"`)
// })

// Then('I should see the chat panel', async function () {
//   const page = this.page
//   const chatBox = await page.$('[data-testid="lobby-chat-box"]')
//   assert.ok(chatBox, 'Expected to see the lobby chat panel')
// })

// Then('the chat input should be cleared', async function () {
//   const page = this.page
//   await page.waitForTimeout(300)
//   const value = await page.inputValue('[data-testid="lobby-chat-input"]')
//   assert.strictEqual(value, '', `Expected empty input, got: "${value}"`)
// })
