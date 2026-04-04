import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

/**
 * Mock de WebSocket inyectado en el navegador antes de que la app arranque.
 * Simula el servidor de salas respondiendo a 'create' y 'join'.
 */
const WS_MOCK_SCRIPT = `
(function () {
  let mockInstance = null;

  window.__triggerWsMessage = function (msgObj) {
    if (mockInstance?._onmessage) {
      mockInstance._onmessage({ data: JSON.stringify(msgObj) });
    }
  };

  window.WebSocket = function MockWebSocket(url) {
    this.readyState = 0;
    mockInstance = this;

    Object.defineProperty(this, 'onopen',    { set: fn => { this._onopen = fn; },    get: () => this._onopen });
    Object.defineProperty(this, 'onmessage', { set: fn => { this._onmessage = fn; }, get: () => this._onmessage });
    Object.defineProperty(this, 'onerror',   { set: fn => { this._onerror = fn; },   get: () => this._onerror });
    Object.defineProperty(this, 'onclose',   { set: fn => { this._onclose = fn; },   get: () => this._onclose });

    setTimeout(() => {
      this.readyState = 1;
      if (this._onopen) this._onopen({});
    }, 30);

    this.send = function (data) {
      const msg = JSON.parse(data);

      if (msg.type === 'create') {
        setTimeout(() => {
          if (this._onmessage) this._onmessage({ data: JSON.stringify({
            type: 'room_created',
            roomCode: 'TST001',
            boardSize: msg.boardSize,
          })});
        }, 60);
      }

      if (msg.type === 'join') {
        setTimeout(() => {
          if (this._onmessage) this._onmessage({ data: JSON.stringify({
            type: 'game_start',
            opponentName: 'Rival',
            playerIndex: 1,
            boardSize: 7,
          })});
        }, 60);
      }

      if (msg.type === 'chat') {
        setTimeout(() => {
          if (this._onmessage) this._onmessage({ data: JSON.stringify({
            type: 'chat',
            from: 'TestUser',
            text: msg.text,
          })});
        }, 40);
      }
    };

    this.close = function (code) {
      this.readyState = 3;
      if (this._onclose) this._onclose({ code: code || 1000 });
    };
  };
  window.WebSocket.OPEN   = 1;
  window.WebSocket.CLOSED = 3;
})();
`

async function loginAndGoToMpLobby (page) {
  await page.addInitScript(WS_MOCK_SCRIPT)

  await page.route('**/login', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }) })
  })
  await page.route('**/v1/game/play', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ yen: { size: 7, turn: 1, players: ['B','R'], layout: Array.from({length:7},(_,i)=>'.'.repeat(i+1)).join('/') }, status: 'Ongoing' }) })
  })
  await page.route('**/api/games', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1 }) })
  })

  await page.goto('http://localhost:5173')
  const playBtn = page.locator('button', { hasText: /play now|jugar/i }).first()
  if (await playBtn.isVisible({ timeout: 2000 }).catch(() => false)) await playBtn.click()
  await page.fill('#username', 'TestUser')
  await page.fill('input[type="password"]', 'Password123')
  await page.click('.submit-button')
  await page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })

  // Seleccionar modo multijugador y arrancar
  await page.click('[data-testid="mode-multiplayer"]')
  await page.click('[data-testid="btn-start-game"]')
  // El lobby aparece (estado idle → tabs Crear/Unirse)
  await page.waitForSelector('[data-testid="tab-create"]', { timeout: 6000 })
}

// ---- Given ----

Given('the user is logged in and on the game page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.addInitScript(WS_MOCK_SCRIPT)

  await page.route('**/login', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ userId: 1 }) })
  })
  await page.route('**/v1/game/play', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ yen: { size: 7, turn: 1, players: ['B','R'], layout: '.' }, status: 'Ongoing' }) })
  })
  await page.route('**/v1/ybot/choose/**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ api_version: 'v1', bot_id: 'random_bot', coords: { x:0,y:0,z:0 } }) })
  })
  await page.route('**/api/games', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1 }) })
  })

  await page.goto('http://localhost:5173')
  const playBtn = page.locator('button', { hasText: /play now|jugar/i }).first()
  if (await playBtn.isVisible({ timeout: 2000 }).catch(() => false)) await playBtn.click()
  await page.fill('#username', 'TestUser')
  await page.fill('input[type="password"]', 'Password123')
  await page.click('.submit-button')
  await page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 8000 })
})

Given('the user is in the multiplayer lobby with an active connection', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await loginAndGoToMpLobby(page)
  // Crear sala para tener conexión activa + chat visible
  await page.click('[data-testid="btn-create-room"]')
  await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
})

// ---- When ----

When('I select the {string} game mode', async function (mode) {
  const page = this.page
  const testId = mode === 'bot' ? 'mode-bot' : 'mode-multiplayer'
  await page.click(`[data-testid="${testId}"]`)
})

When('I click the start game button', async function () {
  const page = this.page
  await page.click('[data-testid="btn-start-game"]')
})

When('the WebSocket server creates a room', async function () {
  const page = this.page
  // El mock responde automáticamente a 'create'; sólo esperamos el código
  await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 5000 })
})

When('I type {string} in the chat', async function (message) {
  const page = this.page
  await page.fill('[data-testid="lobby-chat-input"]', message)
})

When('I send the chat message', async function () {
  const page = this.page
  await page.click('[data-testid="lobby-chat-send"]')
})

// ---- Then ----

Then('I should see the multiplayer lobby', async function () {
  const page = this.page
  await page.waitForSelector('[data-testid="tab-create"]', { timeout: 6000 })
  const tab = await page.$('[data-testid="tab-create"]')
  assert.ok(tab, 'Expected to see the multiplayer lobby tabs')
})

Then('I should see the room ID displayed', async function () {
  const page = this.page
  await page.waitForSelector('[data-testid="room-code-display"]', { timeout: 6000 })
  const code = await page.textContent('[data-testid="room-code-display"]')
  assert.ok(code && code.trim().length > 0, `Expected a room code, got: "${code}"`)
})

Then('I should see the chat panel', async function () {
  const page = this.page
  const chatBox = await page.$('[data-testid="lobby-chat-box"]')
  assert.ok(chatBox, 'Expected to see the lobby chat panel')
})

Then('the chat input should be cleared', async function () {
  const page = this.page
  await page.waitForTimeout(300)
  const value = await page.inputValue('[data-testid="lobby-chat-input"]')
  assert.strictEqual(value, '', `Expected empty input, got: "${value}"`)
})
