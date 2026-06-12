# --- build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
# better-sqlite3 네이티브 빌드 도구
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --include=dev
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- runtime stage ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "dist/main.js"]
