# 🎮 Yovi — Game Y at UniOvi

<div align="center">

[![Release — Test, Build, Publish, Deploy](https://github.com/arquisoft/yovi_es4c/actions/workflows/release-deploy.yml/badge.svg)](https://github.com/arquisoft/yovi_es4c/actions/workflows/release-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es4c&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es4c)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Arquisoft_yovi_es4c&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Arquisoft_yovi_es4c)

**A full-stack multiplayer implementation of the Hex board game, built for the ASW course at UniOvi.**

[▶ Play now](http://localhost) · [Architecture docs](docs/) · [API reference](#api)

</div>

---

## ✨ Features

- **🔐 Auth** — JWT-based login and registration with a dedicated auth microservice
- **🤖 Bot game** — Play against an AI bot (random, greedy, or minimax strategies)
- **🌐 Multiplayer** — Real-time PvP via WebSocket rooms with a 6-character room code
- **💬 Live chat** — In-game chat between players during multiplayer matches
- **📊 Leaderboard** — Global ranking by win rate
- **👤 Profile** — Per-user stats: win rate, streaks, history, bots beaten
- **📈 Monitoring** — Prometheus metrics + Grafana dashboards

---

## 🏗️ Architecture

The system is composed of independent microservices communicating through a central gateway:

```
Browser
  │
  ├─── HTTPS ──▶  nginx  (TLS termination · port 443/80)
  │                 │
  │         ┌───────┼──────────────┐
  │         ▼       ▼              ▼
  │      webapp   ws-server    gateway (Spring Boot · 8080)
  │      (React)  (WebSocket   │
  │               · 8081)      ├──▶ auth-service (Node.js · 3001)
  │                            ├──▶ users        (Node.js · 3000)
  │                            └──▶ gamey         (Rust   · 4000)
  │                                      │
  │                                 mysql (3306)
  │
  └─── Monitoring: Prometheus (9090) · Grafana (9091)
```

### Services

| Service | Tech | Responsibility |
|---|---|---|
| `nginx` | Nginx | TLS termination, reverse proxy, WebSocket upgrade |
| `gateway` | Spring Boot + Java | JWT validation, routing to backend services |
| `auth-service` | Node.js | Login / registration, JWT issuance |
| `users` | Node.js + Express | User CRUD, game history, leaderboard, stats |
| `gamey` | Rust | Game engine, move validation, bot AI (random / greedy / minimax) |
| `ws-server` | Node.js + `ws` | WebSocket multiplayer rooms (create / join by code) |
| `webapp` | React + Vite + TypeScript | Single-page frontend |
| `mysql` | MySQL 8 | Persistent storage (users, games) |
| `prometheus` | Prometheus | Metrics scraping |
| `grafana` | Grafana | Metrics dashboards |

---

## 📁 Repository Structure

```
yovi_es4c/
├── webapp/               # React SPA (Vite + TypeScript + MUI)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/     # LoginForm, RegisterForm, Logout
│   │   │   ├── game/     # Game, HexBoard, GameModeSelector,
│   │   │   │             # MultiplayerLobby, MultiplayerGame, GameHistory
│   │   │   └── layout/   # NavBar, LandingView, ProfileView, LeaderboardView
│   │   ├── hooks/        # useWebSocketRoom (WS multiplayer logic)
│   │   └── api/          # gameyClient, api helpers
│   ├── ws-server/        # WebSocket room server (Node.js)
│   └── test/e2e/         # BDD end-to-end tests (Playwright + Cucumber)
│       ├── features/     # Gherkin feature files
│       └── steps/        # Step definitions
│
├── auth-service/         # JWT auth microservice (Node.js)
├── users/                # User & game data service (Node.js + Express)
│   └── monitoring/       # Prometheus & Grafana config
├── gamey/                # Rust game engine & bot server
│   ├── src/
│   │   ├── core/         # Game state, coords, actions, players
│   │   ├── bot/          # random, greedy, minimax, ybot strategies
│   │   ├── bot_server/   # HTTP bot API
│   │   └── notation/     # YEN / YGN notation
│   ├── tests/            # Integration tests
│   └── benches/          # Benchmarks
├── gateway/              # Spring Boot API gateway (JWT filter, CORS, routing)
├── nginx/                # Reverse proxy + TLS config
├── mysql/                # DB init scripts
└── docs/                 # Arc42 architecture documentation
```

---

## 🚀 Running the Project

### With Docker (recommended)

Requires [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/).

```bash
docker-compose up --build
```

| Endpoint | URL |
|---|---|
| Web application | https://localhost |
| Users API | http://localhost:3000 |
| Gamey API | http://localhost:4000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:9091 |

> **Note:** The first time you run this, Docker will build all images which may take a few minutes.

### Without Docker (development)

You need [Node.js](https://nodejs.org/) and [Rust](https://www.rust-lang.org/) installed.

**1 — Users service**
```bash
cd users && npm install && npm start
# → http://localhost:3000
```

**2 — Auth service**
```bash
cd auth-service && npm install && npm start
# → http://localhost:3001
```

**3 — Gamey engine**
```bash
cd gamey && cargo run
# → http://localhost:4000
```

**4 — WebSocket server**
```bash
cd webapp/ws-server && npm install && node index.js
# → ws://localhost:8081
```

**5 — Webapp** (starts Vite dev server + users service concurrently)
```bash
cd webapp && npm install && npm run start:all
# → http://localhost:5173
```

---

## 🧪 Testing

### Unit tests

```bash
# Webapp (Vitest)
cd webapp && npm test

# Webapp with coverage
cd webapp && npm run test:coverage

# Auth service (Vitest)
cd auth-service && npm test

# Auth service with coverage
cd auth-service && npm run test:coverage

# Users service
cd users && npm test

# Users service
cd users && npm run test:coverage

# Gamey (Rust)
cd gamey && cargo test
```

### End-to-end tests (Playwright + Cucumber)

The E2E suite covers the full user journey: registration, login, bot game, multiplayer lobby, WebSocket flow, chat, leaderboard and profile.

```bash
cd webapp

# Install Playwright browsers (first time only)
npm run test:e2e:install-browsers

# Run all E2E tests (auto-starts dev servers)
npm run test:e2e

# Run only E2E tests (dev servers must already be running)
npm run test:e2e:run
```

**E2E feature files:**

| Feature | Scenarios |
|---|---|
| `register.feature` | User registration |
| `registration.feature` | Login form validation |
| `game-mode.feature` | Game mode selection, board size, bot starts |
| `bot-game.feature` | Bot gameplay, win condition, back to menu |
| `multiplayer-websocket.feature` | Full WebSocket lifecycle (create/join room, game, chat, errors) |
| `multiplayer-lobby.feature` | Lobby UI |
| `navigation-profile.feature` | NavBar, logout, leaderboard, profile |

### Gamey benchmarks

```bash
cd gamey && cargo bench
```

---

## 🔌 WebSocket Multiplayer Protocol

The `ws-server` manages multiplayer rooms. Messages are JSON.

**Client → Server**

| Message | Fields | Description |
|---|---|---|
| `create` | `username`, `boardSize`, `userId?` | Create a new room |
| `join` | `username`, `roomCode`, `userId?` | Join an existing room by code |
| `board_update` | `layout`, `turn` | Broadcast a move to the opponent |
| `game_over` | `layout`, `winner` | Broadcast game end |
| `chat` | `text` | Send a chat message |

**Server → Client**

| Message | Fields | Description |
|---|---|---|
| `room_created` | `roomCode`, `boardSize` | Room created successfully |
| `game_start` | `opponentName`, `opponentUserId`, `playerIndex`, `boardSize` | Both players connected, game starts |
| `board_update` | `layout`, `turn` | Forwarded move from opponent |
| `game_over` | `layout`, `winner` | Forwarded game end from opponent |
| `chat` | `from`, `text` | Chat message with sender name added |
| `error` | `message` | Error description |

---

## 📜 Available Scripts

### `webapp/`

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript compile + Vite build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:e2e` | Run E2E tests (auto-starts servers) |
| `npm run test:e2e:run` | Run E2E tests (servers must be running) |
| `npm run start:all` | Start webapp + users service concurrently |

### `users/`

| Script | Description |
|---|---|
| `npm start` | Start the users service |
| `npm test` | Run tests (Vitest) |

### `gamey/`

| Command | Description |
|---|---|
| `cargo build` | Build the game engine |
| `cargo test` | Run unit + integration tests |
| `cargo bench` | Run benchmarks |
| `cargo run` | Start the bot HTTP server |
| `cargo doc` | Generate API documentation |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, MUI |
| Bot engine | Rust, Axum |
| Backend services | Node.js, Express |
| API gateway | Spring Boot, Java |
| Database | MySQL 8 |
| Real-time | WebSockets (`ws` library) |
| Proxy / TLS | Nginx |
| Monitoring | Prometheus, Grafana |
| Testing | Vitest, Playwright, Cucumber (BDD), Rust test + criterion |
| CI/CD | GitHub Actions |
| Code quality | SonarCloud |
| Containerisation | Docker, Docker Compose, GHCR |
