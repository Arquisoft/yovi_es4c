FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY auth-service.js .
USER node
EXPOSE 3001
CMD ["node", "auth-service.js"]