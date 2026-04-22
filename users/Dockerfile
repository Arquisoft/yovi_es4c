FROM node:22-alpine
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --silent --ignore-scripts

COPY --chown=node:node . .

USER node

EXPOSE 3000
CMD ["node", "users-service.js"]
