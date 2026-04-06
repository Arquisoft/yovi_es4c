# ── Etapa de build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .

# Variables de entorno de Vite (build time)
# En producción el cliente conecta al mismo host/puerto (80),
# Nginx se encarga de proxiar todo.
ARG VITE_API_URL="https://localhost"
ARG VITE_GAMEY_URL="https://localhost"
# WebSocket a través de Nginx en /ws (mismo host, sin puerto extra)
ARG VITE_WS_URL="wss://localhost/ws"

RUN VITE_API_URL=${VITE_API_URL} \
    VITE_GAMEY_URL=${VITE_GAMEY_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    npm run build

# ── Etapa de producción (Nginx) ──────────────────────────────────────────────
FROM nginx:stable-alpine

# Copia el build de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia la configuración de Nginx con los proxies HTTP y WebSocket
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
