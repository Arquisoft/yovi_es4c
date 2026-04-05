import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

/**
 * Mock de WebSocket inyectado en el navegador.
 * Se exporta para que otros steps files puedan reutilizarlo.
 */
export const WS_MOCK_SCRIPT = `
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

/**
 * Helper compartido: navega a la app, supera la landing si existe, y hace login.
 */
export async function loginAndNavigate(page) {
  await page.goto('http://localhost:5173')
  await page.waitForLoadState('networkidle')

  // Si hay landing page con botón Play/Jugar, hacer clic
  const playBtn = page.locator('button', { hasText: /play now|jugar/i }).first()
  if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await playBtn.click()
  }

  // Esperar al campo username del login
  await page.waitForSelector('#username', { timeout: 10000 })
  await page.fill('#username', 'TestUser')
  await page.fill('input[type="password"]', 'Password123')
  await page.click('.submit-button')

  // Esperar al selector de modo de juego
  await page.waitForSelector('[data-testid="btn-start-game"]', { timeout: 10000 })
}

// ---- Shared setup: login + navigate to game ----

Given('the user is logged in and on the game page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.addInitScript(WS_MOCK_SCRIPT)

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

  await page.route('**/v1/game/play', async route => {
    const body = route.request().postDataJSON()
    const size = body?.yen?.size ?? 7
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

  await loginAndNavigate(page)
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
  await page.waitForSelector('[data-testid="tab-create"]', { timeout: 8000 })
  const tab = await page.$('[data-testid="tab-create"]')
  assert.ok(tab, 'Expected to see the multiplayer lobby tabs')
})
