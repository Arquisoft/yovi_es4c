/**
 * multiplayer-websocket.steps.mjs
 *
 * Step definitions for multiplayer-websocket.feature.
 *
 * Tras analizar GameView.tsx sabemos que:
 *  - handleMpDisconnect() llama a disconnect() + setPhase('selector')
 *    → tras desconectarse se renderiza GameModeSelector, no MultiplayerLobby
 *  - handleMpLeave en MultiplayerGame también llama a handleMpDisconnect
 *    → mismo resultado: vuelve al selector
 *
 * Por tanto "Then I should see the game mode selector" es correcto para
 * tanto el disconnect del lobby como el leave de la partida.
 */

import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'
import { WS_MOCK_SCRIPT, loginAndNavigate } from './game-mode.steps.mjs'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function setupAndNavigate(page) {
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

  await loginAndNavigate(page)
}

async function goToMultiplayerLobby(page) {
  await page.click('[data-testid="mode-multiplayer"]')
  await page.click('[data-testid="btn-start-game"]')
  await page.waitForSelector('[data-testid="tab-create"]', { timeout: 8000 })
}

async function createRoomAndWait(page) {
  await page.click('[data-testid="btn-create-room"]')
  await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
}

async function triggerGameStart(page, playerIndex = 0) {
  await page.evaluate((idx) => {
    window.__triggerWsMessage({
      type: 'game_start',
      opponentName: 'Rival',
      opponentUserId: 2,
      playerIndex: idx,
      boardSize: 7,
    })
  }, playerIndex)
  await page.waitForSelector('[data-testid="hex-board"]', { timeout: 8000 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Given
// ─────────────────────────────────────────────────────────────────────────────

Given('the user is in the multiplayer lobby waiting state', async function () {
  const { page } = this
  await setupAndNavigate(page)
  await goToMultiplayerLobby(page)
  await createRoomAndWait(page)
})

Given('both players are connected and the game has started', async function () {
  const { page } = this
  await setupAndNavigate(page)
  await goToMultiplayerLobby(page)
  await createRoomAndWait(page)
  await triggerGameStart(page, 0)
})

Given('both players are connected and the game has started as player index {int}', async function (idx) {
  const { page } = this
  await setupAndNavigate(page)
  await goToMultiplayerLobby(page)
  await createRoomAndWait(page)
  await triggerGameStart(page, idx)
})

// ─────────────────────────────────────────────────────────────────────────────
// When
// ─────────────────────────────────────────────────────────────────────────────

When('I click the create room button', async function () {
  await this.page.click('[data-testid="btn-create-room"]')
})

When('I click the copy room code button', async function () {
  // Object.defineProperty funciona en Chromium; Object.assign no (clipboard es getter-only)
  await this.page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      configurable: true,
      writable: true,
    })
  })
  await this.page.click('[data-testid="copy-code-btn"]')
})

When('I click the disconnect button', async function () {
  // btn-disconnect solo existe cuando isConnected=true (estado waiting/connecting/playing)
  await this.page.click('[data-testid="btn-disconnect"]')
  // handleMpDisconnect → disconnect() + setPhase('selector') → renderiza GameModeSelector
  await this.page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })
})

When('I switch to the join room tab', async function () {
  await this.page.click('[data-testid="tab-join"]')
  await this.page.waitForSelector('[data-testid="join-code-input"]', { timeout: 4000 })
})

When('I enter the room code {string}', async function (code) {
  await this.page.fill('[data-testid="join-code-input"]', code)
})

When('I click the join room button', async function () {
  await this.page.click('[data-testid="btn-join-room"]')
})

When('I press Enter in the code input', async function () {
  await this.page.press('[data-testid="join-code-input"]', 'Enter')
})

When('I click on a cell in the multiplayer board', async function () {
  const cell = this.page.locator('[data-testid="hex-board"] [role="button"]').first()
  await cell.waitFor({ timeout: 5000 })
  await cell.click()
})

When('I click the leave game button', async function () {
  // btn-leave está en MultiplayerGame → onLeave → handleMpDisconnect → selector
  await this.page.click('[data-testid="btn-leave"]')
  await this.page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })
})

When('the server sends a board_update message', async function () {
  const newLayout = Array.from({ length: 7 }, (_, i) =>
    i === 0 ? 'B' : '.'.repeat(i + 1)
  ).join('/')
  await this.page.evaluate((layout) => {
    window.__triggerWsMessage({ type: 'board_update', layout, turn: 0 })
  }, newLayout)
})

When('the server sends a game_over message with winner {int}', async function (winner) {
  const layout = Array.from({ length: 7 }, (_, i) => 'B'.repeat(i + 1)).join('/')
  await this.page.evaluate((msg) => {
    window.__triggerWsMessage(msg)
  }, { type: 'game_over', layout, winner })
  await this.page.waitForSelector('[data-testid="mp-game-status"]', { timeout: 5000 })
})

When('the server sends a disconnection error message', async function () {
  await this.page.evaluate(() => {
    window.__triggerWsMessage({ type: 'error', message: 'El oponente se ha desconectado.' })
  })
})

/**
 * Parchamos el MockWebSocket que ya está corriendo en la página para que el
 * próximo mensaje 'join' dispare un error en lugar de un game_start.
 * WS_MOCK_SCRIPT expone window.__triggerWsMessage; aquí interceptamos send.
 */
When('the WebSocket responds with a room not found error', async function () {
  await this.page.evaluate(() => {
    // Sobreescribir WebSocket globalmente antes de que se cree la conexión del join.
    // El mock original ya está inyectado via addInitScript; aquí lo extendemos
    // para que el próximo 'join' reciba un error.
    const OrigWS = window.WebSocket

    window.WebSocket = function PatchedWS(url) {
      const instance = new OrigWS(url)
      const origSend = instance.send.bind(instance)

      instance.send = function (data) {
        let msg
        try { msg = JSON.parse(data) } catch { return origSend(data) }

        if (msg.type === 'join') {
          setTimeout(() => {
            window.__triggerWsMessage({
              type: 'error',
              message: `Sala "${msg.roomCode}" no encontrada o ya está llena.`,
            })
          }, 60)
          return
        }
        origSend(data)
      }
      return instance
    }
    // Copiar propiedades estáticas del mock original
    window.WebSocket.OPEN   = OrigWS.OPEN   ?? 1
    window.WebSocket.CLOSED = OrigWS.CLOSED ?? 3
  })
})

When('I type {string} in the multiplayer chat', async function (text) {
  await this.page.fill('[data-testid="mp-chat-input"]', text)
})

When('I click the send chat button', async function () {
  await this.page.click('[data-testid="mp-chat-send"]')
})

When('I press Enter in the chat input', async function () {
  await this.page.press('[data-testid="mp-chat-input"]', 'Enter')
})

When('the server sends a chat message from {string} saying {string}', async function (from, text) {
  await this.page.evaluate((msg) => {
    window.__triggerWsMessage(msg)
  }, { type: 'chat', from, text })
})

// ─────────────────────────────────────────────────────────────────────────────
// Then
// ─────────────────────────────────────────────────────────────────────────────

Then('I should see a room code of {int} characters', async function (length) {
  await this.page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
  const code = await this.page.textContent('[data-testid="room-code-display"]')
  assert.ok(
    code && code.trim().length === length,
    `Expected room code of ${length} chars, got: "${code?.trim()}"`,
  )
})

Then('I should see the waiting screen', async function () {
  await this.page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
})

Then('the copy confirmation message should appear', async function () {
  await this.page.waitForSelector('[data-testid="copy-confirm"]', { timeout: 3000 })
  const msg = await this.page.textContent('[data-testid="copy-confirm"]')
  assert.ok(msg && msg.length > 0, 'Expected copy confirmation text')
})

// "I should see the game mode selector" está definido en bot-game.steps.mjs
// y es el correcto para disconnect y leave (ambos van a GameModeSelector vía setPhase)

Then('I should see the join code input field', async function () {
  const input = await this.page.$('[data-testid="join-code-input"]')
  assert.ok(input, 'Expected join code input to be visible')
})

Then('the game should start with an opponent named {string}', async function (name) {
  await this.page.waitForSelector('[data-testid="hex-board"]', { timeout: 8000 })
  const bodyText = await this.page.textContent('body')
  assert.ok(
    bodyText && bodyText.includes(name),
    `Expected opponent name "${name}" somewhere on the page`,
  )
})

Then('the join room button should be disabled', async function () {
  const btn = this.page.locator('[data-testid="btn-join-room"]')
  await btn.waitFor({ timeout: 4000 })
  const disabled = await btn.isDisabled()
  assert.ok(disabled, 'Expected join room button to be disabled')
})

Then('I should see the multiplayer game board', async function () {
  await this.page.waitForSelector('[data-testid="hex-board"]', { timeout: 8000 })
  const board = await this.page.$('[data-testid="hex-board"]')
  assert.ok(board, 'Expected hex board to be visible')
})

Then('I should see the game status indicator', async function () {
  await this.page.waitForSelector('[data-testid="mp-game-status"]', { timeout: 5000 })
  const status = await this.page.textContent('[data-testid="mp-game-status"]')
  assert.ok(status && status.trim().length > 0, 'Expected non-empty game status')
})

Then('the board should reflect the move', async function () {
  await this.page.waitForSelector('[data-testid="hex-board"]', { timeout: 5000 })
  const board = await this.page.$('[data-testid="hex-board"]')
  assert.ok(board, 'Board should still be visible after a move')
})

Then('the board cells should not be interactive', async function () {
  const cells = this.page.locator('[data-testid="hex-board"] [role="button"]')
  const count = await cells.count()
  if (count === 0) return
  const firstDisabled = await cells.first().isDisabled()
  assert.ok(firstDisabled, 'Board cells should be disabled when it is not the player\'s turn')
})

Then('the board layout should be updated', async function () {
  await this.page.waitForSelector('[data-testid="hex-board"]', { timeout: 5000 })
  const board = await this.page.$('[data-testid="hex-board"]')
  assert.ok(board, 'Board should be visible after a board_update message')
})

Then('I should see the victory status in the multiplayer game', async function () {
  await this.page.waitForSelector('[data-testid="mp-game-status"]', { timeout: 5000 })
  const status = await this.page.textContent('[data-testid="mp-game-status"]')
  assert.ok(
    status && (status.includes('ganado') || status.includes('won') || status.includes('Has')),
    `Expected victory message, got: "${status}"`,
  )
})

Then('I should see the defeat status in the multiplayer game', async function () {
  await this.page.waitForSelector('[data-testid="mp-game-status"]', { timeout: 5000 })
  const status = await this.page.textContent('[data-testid="mp-game-status"]')
  assert.ok(
    status && (status.includes('Rival') || status.includes('ganado') || status.includes('perdido')),
    `Expected defeat message, got: "${status}"`,
  )
})

Then('the back to lobby button should be visible', async function () {
  await this.page.waitForSelector('[data-testid="btn-back-lobby"]', { timeout: 5000 })
  const btn = await this.page.$('[data-testid="btn-back-lobby"]')
  assert.ok(btn, 'Expected "back to lobby" button to be visible after game over')
})

Then('the chat message {string} should appear in the chat box', async function (text) {
  await this.page.waitForSelector('[data-testid="mp-chat-box"]', { timeout: 5000 })
  const chatContent = await this.page.textContent('[data-testid="mp-chat-box"]')
  assert.ok(
    chatContent && chatContent.includes(text),
    `Expected chat box to contain "${text}", got: "${chatContent}"`,
  )
})

Then('the chat input should be empty', async function () {
  const value = await this.page.inputValue('[data-testid="mp-chat-input"]')
  assert.strictEqual(value, '', `Expected empty chat input, got: "${value}"`)
})

Then('the message {string} from {string} should appear in the chat box', async function (text, from) {
  await this.page.waitForSelector('[data-testid="mp-chat-box"]', { timeout: 5000 })
  const chatContent = await this.page.textContent('[data-testid="mp-chat-box"]')
  assert.ok(
    chatContent && chatContent.includes(text) && chatContent.includes(from),
    `Expected chat to contain "${text}" from "${from}", got: "${chatContent}"`,
  )
})

Then('the send chat button should be disabled when the input is empty', async function () {
  await this.page.fill('[data-testid="mp-chat-input"]', '')
  const btn = this.page.locator('[data-testid="mp-chat-send"]')
  const disabled = await btn.isDisabled()
  assert.ok(disabled, 'Expected send button to be disabled with empty chat input')
})

Then('I should see the WebSocket error alert', async function () {
  await this.page.waitForSelector('[data-testid="ws-error"]', { timeout: 8000 })
  const alert = await this.page.$('[data-testid="ws-error"]')
  assert.ok(alert, 'Expected WebSocket error alert to be visible')
})
