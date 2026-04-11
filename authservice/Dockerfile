FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY auth-service.js .
EXPOSE 3001
CMD ["node", "auth-service.js"]