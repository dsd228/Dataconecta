# Dockerfile for realtime stub (socket.io + y-websocket)
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .
EXPOSE 1234
CMD ["node", "server.js"]
