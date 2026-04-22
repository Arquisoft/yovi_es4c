FROM node:22-alpine
WORKDIR /app

COPY --chown=node:node --chmod=550 package.json package-lock.json ./
RUN npm ci --silent --ignore-scripts

COPY --chown=node:node --chmod=550 users-service.js .

USER node

EXPOSE 3000
CMD ["node", "users-service.js"]
