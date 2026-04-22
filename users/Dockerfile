FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent --ignore-scripts

COPY users-service.js .

USER node

EXPOSE 3000
CMD ["node", "users-service.js"]
